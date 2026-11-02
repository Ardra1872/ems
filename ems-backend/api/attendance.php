<?php
require_once "../config/database.php";

$currentUser = requireAuth();
$method = $_SERVER["REQUEST_METHOD"];
$action = $_GET["action"] ?? "";

function findAttendanceForDay($employeeId, $date) {
    global $conn;
    $stmt = $conn->prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = ? LIMIT 1");
    $stmt->bind_param("is", $employeeId, $date);
    $stmt->execute();
    $record = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $record;
}

if ($method === "GET") {
    $requestedEmployeeId = isset($_GET["employee_id"]) ? intval($_GET["employee_id"]) : 0;
    if ($currentUser["role"] === "employee") {
        $requestedEmployeeId = intval($currentUser["id"]);
    } elseif ($currentUser["role"] === "manager" && $requestedEmployeeId > 0) {
        requireManagedEmployee($requestedEmployeeId, $currentUser);
    }

    if ($requestedEmployeeId > 0) {
        $dateFilter = getDateRangeFilter("date");
        $stmt = $conn->prepare("SELECT * FROM attendance WHERE employee_id = ?$dateFilter ORDER BY date DESC, id DESC");
        $stmt->bind_param("i", $requestedEmployeeId);
        $stmt->execute();
        $result = $stmt->get_result();
    } elseif ($currentUser["role"] === "manager") {
        $dateFilter = getDateRangeFilter("a.date");
        $stmt = $conn->prepare(
            "SELECT a.* FROM attendance a
             WHERE EXISTS (
                SELECT 1 FROM employees e
                WHERE e.id = a.employee_id AND (
                    e.id = ? OR e.department <=> ? OR EXISTS (
                        SELECT 1 FROM project_members pm
                        INNER JOIN projects p ON p.id = pm.project_id
                        WHERE pm.employee_id = e.id AND p.manager_id = ?
                    )
                )
             )$dateFilter
             ORDER BY a.date DESC, a.id DESC"
        );
        $stmt->bind_param("isi", $currentUser["id"], $currentUser["department"], $currentUser["id"]);
        $stmt->execute();
        $result = $stmt->get_result();
    } elseif ($currentUser["role"] === "admin") {
        $dateFilter = getDateRangeFilter("date");
        $result = $conn->query("SELECT * FROM attendance WHERE 1=1$dateFilter ORDER BY date DESC, id DESC");
    } else {
        sendResponse(false, null, "You do not have permission to view attendance records", 403);
    }

    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $row["id"] = intval($row["id"]);
        $row["employee_id"] = intval($row["employee_id"]);
        $row["total_hours"] = floatval($row["total_hours"]);
        $logs[] = $row;
    }
    if (isset($stmt)) {
        $stmt->close();
    }
    sendResponse(true, $logs);
}

if ($method === "POST") {
    $data = getJsonInput();
    $today = date("Y-m-d");
    $timeNow = date("h:i A");

    if ($action === "clock_in" || $action === "clock_out") {
        $currentUser = requireRole("employee");
        $employeeId = intval($currentUser["id"]);
        $record = findAttendanceForDay($employeeId, $today);

        if ($action === "clock_in") {
            $workMode = trim($data["work_mode"] ?? "Office");
            if (!in_array($workMode, ["Office", "Remote"], true)) {
                sendResponse(false, null, "Choose Office or Remote work mode", 422);
            }
            if ($record) {
                sendResponse(false, null, "An attendance session already exists for today", 409);
            }

            $stmt = $conn->prepare(
                "INSERT INTO attendance (employee_id, employee_name, date, check_in, check_out, total_hours, status, work_mode)
                 VALUES (?, ?, ?, ?, '-', 0.0, 'Present', ?)"
            );
            $stmt->bind_param("issss", $employeeId, $currentUser["name"], $today, $timeNow, $workMode);
            if (!$stmt->execute()) {
                error_log("Failed to clock in: " . $stmt->error);
                $stmt->close();
                sendResponse(false, null, "Could not clock in", 500);
            }
            $recordId = $stmt->insert_id;
            $stmt->close();
            recordAudit($currentUser["user_id"], "attendance.clocked_in", "attendance", $recordId, [
                "work_mode" => $workMode
            ]);
            sendResponse(true, findAttendanceForDay($employeeId, $today), "Clocked in successfully", 201);
        }

        if (!$record || $record["check_in"] === "-" || $record["check_out"] !== "-") {
            sendResponse(false, null, "No active clock-in session was found for today", 409);
        }
        $checkInTime = strtotime($record["check_in"]);
        $checkOutTime = time();
        if ($checkInTime === false || $checkOutTime <= $checkInTime) {
            sendResponse(false, null, "Could not calculate the attendance session duration", 422);
        }
        $hours = round(($checkOutTime - $checkInTime) / 3600, 2);
        if ($hours >= 24) {
            sendResponse(false, null, "Attendance session duration is invalid", 422);
        }
        $stmt = $conn->prepare("UPDATE attendance SET check_out = ?, total_hours = ? WHERE id = ?");
        $stmt->bind_param("sdi", $timeNow, $hours, $record["id"]);
        if (!$stmt->execute()) {
            error_log("Failed to clock out: " . $stmt->error);
            $stmt->close();
            sendResponse(false, null, "Could not clock out", 500);
        }
        $stmt->close();
        recordAudit($currentUser["user_id"], "attendance.clocked_out", "attendance", intval($record["id"]), [
            "total_hours" => $hours
        ]);
        sendResponse(true, findAttendanceForDay($employeeId, $today), "Clocked out successfully");
    }

    $currentUser = requireRole(["admin", "manager"]);
    $employeeId = filter_var($data["employee_id"] ?? null, FILTER_VALIDATE_INT);
    $date = trim($data["date"] ?? $today);
    $checkIn = trim($data["check_in"] ?? "09:00 AM");
    $checkOut = trim($data["check_out"] ?? "05:30 PM");
    $hours = filter_var($data["total_hours"] ?? 8.5, FILTER_VALIDATE_FLOAT);
    $status = trim($data["status"] ?? "Present");
    $workMode = trim($data["work_mode"] ?? "Office");
    $validStatuses = ["Present", "Late", "Half Day", "Leave", "Absent"];

    if ($employeeId === false || $employeeId <= 0) {
        sendResponse(false, null, "Employee ID is required", 422);
    }
    if ($currentUser["role"] === "manager") {
        requireManagedEmployee($employeeId, $currentUser);
    }
    $dateValue = DateTime::createFromFormat("!Y-m-d", $date);
    if (!$dateValue || $dateValue->format("Y-m-d") !== $date ||
        $hours === false || $hours < 0 || $hours > 24 ||
        !in_array($status, $validStatuses, true) ||
        !in_array($workMode, ["Office", "Remote"], true)) {
        sendResponse(false, null, "Enter a valid attendance date, duration, status, and work mode", 422);
    }

    $employeeStmt = $conn->prepare("SELECT name FROM employees WHERE id = ?");
    $employeeStmt->bind_param("i", $employeeId);
    $employeeStmt->execute();
    $employee = $employeeStmt->get_result()->fetch_assoc();
    $employeeStmt->close();
    if (!$employee) {
        sendResponse(false, null, "Employee not found", 404);
    }
    $previousRecord = findAttendanceForDay($employeeId, $date);

    $stmt = $conn->prepare(
        "INSERT INTO attendance (employee_id, employee_name, date, check_in, check_out, total_hours, status, work_mode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE check_in = VALUES(check_in), check_out = VALUES(check_out),
         total_hours = VALUES(total_hours), status = VALUES(status), work_mode = VALUES(work_mode)"
    );
    $stmt->bind_param("issssdss", $employeeId, $employee["name"], $date, $checkIn, $checkOut, $hours, $status, $workMode);
    if (!$stmt->execute()) {
        error_log("Failed to save attendance correction: " . $stmt->error);
        $stmt->close();
        sendResponse(false, null, "Could not save attendance record", 500);
    }
    $stmt->close();
    $updatedRecord = findAttendanceForDay($employeeId, $date);
    recordAudit($currentUser["user_id"], "attendance.corrected", "attendance", intval($updatedRecord["id"]), [
        "employee_id" => $employeeId,
        "date" => $date,
        "before" => $previousRecord ? [
            "check_in" => $previousRecord["check_in"],
            "check_out" => $previousRecord["check_out"],
            "total_hours" => floatval($previousRecord["total_hours"]),
            "status" => $previousRecord["status"],
            "work_mode" => $previousRecord["work_mode"]
        ] : null,
        "after" => [
            "check_in" => $checkIn,
            "check_out" => $checkOut,
            "total_hours" => $hours,
            "status" => $status,
            "work_mode" => $workMode
        ]
    ]);
    sendResponse(true, ["id" => intval($updatedRecord["id"])], "Attendance recorded successfully");
}

sendResponse(false, null, "Method not allowed", 405);
?>
