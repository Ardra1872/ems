<?php
require_once "../config/database.php";

$currentUser = requireAuth();
$method = $_SERVER["REQUEST_METHOD"];
$id = isset($_GET["id"]) ? intval($_GET["id"]) : 0;

function findLeave($leaveId) {
    global $conn;
    $stmt = $conn->prepare("SELECT * FROM leaves WHERE id = ? LIMIT 1");
    $stmt->bind_param("i", $leaveId);
    $stmt->execute();
    $leave = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $leave;
}

if ($method === "GET") {
    $requestedEmployeeId = isset($_GET["employee_id"]) ? intval($_GET["employee_id"]) : 0;
    if ($currentUser["role"] === "employee") {
        $requestedEmployeeId = intval($currentUser["id"]);
    } elseif ($currentUser["role"] === "manager" && $requestedEmployeeId > 0) {
        requireManagedEmployee($requestedEmployeeId, $currentUser);
    }

    if ($requestedEmployeeId > 0) {
        $dateFilter = getDateRangeFilter("applied_on");
        $stmt = $conn->prepare("SELECT * FROM leaves WHERE employee_id = ?$dateFilter ORDER BY id DESC");
        $stmt->bind_param("i", $requestedEmployeeId);
        $stmt->execute();
        $result = $stmt->get_result();
    } elseif ($currentUser["role"] === "manager") {
        $dateFilter = getDateRangeFilter("l.applied_on");
        $stmt = $conn->prepare(
            "SELECT l.* FROM leaves l
             INNER JOIN employees e ON e.id = l.employee_id
             WHERE (e.id = ? OR e.department <=> ? OR EXISTS (
                SELECT 1 FROM project_members pm
                INNER JOIN projects p ON p.id = pm.project_id
                WHERE pm.employee_id = e.id AND p.manager_id = ?
             ))$dateFilter
             ORDER BY l.id DESC"
        );
        $stmt->bind_param("isi", $currentUser["id"], $currentUser["department"], $currentUser["id"]);
        $stmt->execute();
        $result = $stmt->get_result();
    } elseif ($currentUser["role"] === "admin") {
        $dateFilter = getDateRangeFilter("applied_on");
        $result = $conn->query("SELECT * FROM leaves WHERE 1=1$dateFilter ORDER BY id DESC");
    } else {
        sendResponse(false, null, "You do not have permission to view leave requests", 403);
    }

    $leaves = [];
    while ($row = $result->fetch_assoc()) {
        $row["id"] = intval($row["id"]);
        $row["employee_id"] = intval($row["employee_id"]);
        $row["days"] = floatval($row["days"]);
        $leaves[] = $row;
    }
    if (isset($stmt)) {
        $stmt->close();
    }
    sendResponse(true, $leaves);
}

if ($method === "POST") {
    $currentUser = requireRole("employee");
    $data = getJsonInput();
    $leaveType = trim($data["leave_type"] ?? "");
    $startDate = trim($data["start_date"] ?? "");
    $endDate = trim($data["end_date"] ?? "");
    $days = filter_var($data["days"] ?? null, FILTER_VALIDATE_FLOAT);
    $reason = trim($data["reason"] ?? "");
    $allowedTypes = [
        "Casual Leave",
        "Sick Leave",
        "Annual Leave",
        "Maternity/Paternity",
        "Unpaid Leave"
    ];

    $start = DateTime::createFromFormat("!Y-m-d", $startDate);
    $end = DateTime::createFromFormat("!Y-m-d", $endDate);
    if (!$start || $start->format("Y-m-d") !== $startDate ||
        !$end || $end->format("Y-m-d") !== $endDate ||
        $endDate < $startDate || $startDate < date("Y-m-d")) {
        sendResponse(false, null, "Leave dates must be valid, in order, and not in the past", 422);
    }
    $maximumDays = intval($start->diff($end)->days) + 1;
    if (!in_array($leaveType, $allowedTypes, true) ||
        $days === false || $days <= 0 || $days > $maximumDays ||
        $reason === "") {
        sendResponse(false, null, "Enter a valid leave type, duration, and reason", 422);
    }

    $overlapStmt = $conn->prepare(
        "SELECT id FROM leaves
         WHERE employee_id = ? AND status IN ('Pending', 'Approved')
         AND start_date <= ? AND end_date >= ? LIMIT 1"
    );
    $overlapStmt->bind_param("iss", $currentUser["id"], $endDate, $startDate);
    $overlapStmt->execute();
    $hasOverlap = $overlapStmt->get_result()->num_rows > 0;
    $overlapStmt->close();
    if ($hasOverlap) {
        sendResponse(false, null, "You already have a pending or approved leave request for these dates", 409);
    }

    $appliedOn = date("Y-m-d");
    $stmt = $conn->prepare(
        "INSERT INTO leaves (employee_id, employee_name, department, leave_type, start_date, end_date, days, reason, status, applied_on, reviewer_comments)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, '')"
    );
    $stmt->bind_param(
        "isssssdss",
        $currentUser["id"],
        $currentUser["name"],
        $currentUser["department"],
        $leaveType,
        $startDate,
        $endDate,
        $days,
        $reason,
        $appliedOn
    );
    if (!$stmt->execute()) {
        error_log("Failed to submit leave request: " . $stmt->error);
        $stmt->close();
        sendResponse(false, null, "Could not submit leave request", 500);
    }
    $newId = $stmt->insert_id;
    $stmt->close();
    recordAudit($currentUser["user_id"], "leave.applied", "leave", $newId, [
        "leave_type" => $leaveType,
        "start_date" => $startDate,
        "end_date" => $endDate,
        "days" => $days
    ]);
    sendResponse(true, findLeave($newId), "Leave request submitted successfully", 201);
}

if ($method === "PATCH") {
    $currentUser = requireRole(["admin", "manager"]);
    if ($id <= 0) {
        sendResponse(false, null, "Leave ID required", 422);
    }
    $leave = findLeave($id);
    if (!$leave) {
        sendResponse(false, null, "Leave request not found", 404);
    }
    if (intval($leave["employee_id"]) === intval($currentUser["id"])) {
        sendResponse(false, null, "You cannot review your own leave request", 403);
    }
    if ($currentUser["role"] === "manager") {
        requireManagedEmployee(intval($leave["employee_id"]), $currentUser);
    }

    $data = getJsonInput();
    $status = trim($data["status"] ?? "");
    $reviewerComments = trim($data["reviewer_comments"] ?? "");
    if (!in_array($status, ["Approved", "Rejected"], true)) {
        sendResponse(false, null, "Leave requests can only be approved or rejected", 422);
    }
    if ($leave["status"] !== "Pending") {
        sendResponse(false, null, "Only pending leave requests can be reviewed", 409);
    }

    $stmt = $conn->prepare("UPDATE leaves SET status = ?, reviewer_comments = ? WHERE id = ? AND status = 'Pending'");
    $stmt->bind_param("ssi", $status, $reviewerComments, $id);
    if (!$stmt->execute() || $stmt->affected_rows !== 1) {
        error_log("Failed to update leave decision: " . $stmt->error);
        $stmt->close();
        sendResponse(false, null, "Could not update leave decision", 500);
    }
    $stmt->close();
    recordAudit($currentUser["user_id"], "leave.reviewed", "leave", $id, [
        "from" => "Pending",
        "to" => $status,
        "reviewer_comments" => $reviewerComments
    ]);
    sendResponse(true, findLeave($id), "Leave request " . strtolower($status));
}

sendResponse(false, null, "Method not allowed", 405);
?>
