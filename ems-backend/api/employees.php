<?php
require_once "../config/database.php";

$currentUser = requireAuth();
$method = $_SERVER["REQUEST_METHOD"];
$id = isset($_GET["id"]) ? intval($_GET["id"]) : 0;
$action = isset($_GET["action"]) ? $_GET["action"] : "";

// GET ALL OR SINGLE EMPLOYEE
if ($method === "GET") {
    $selectFields = $currentUser["role"] === "admin"
        ? "id, employee_code, name, email, phone, department, designation, role, status, salary, avatar, joining_date, created_at"
        : "id, employee_code, name, email, phone, department, designation, role, status, avatar, joining_date, created_at";
    if ($id > 0) {
        if ($currentUser["role"] === "employee") {
            $stmt = $conn->prepare("SELECT $selectFields FROM employees WHERE id = ? AND department <=> ?");
            $stmt->bind_param("is", $id, $currentUser["department"]);
        } elseif ($currentUser["role"] === "manager") {
            $stmt = $conn->prepare(
                "SELECT $selectFields FROM employees e
                 WHERE e.id = ? AND (
                    e.id = ? OR e.department <=> ? OR EXISTS (
                        SELECT 1 FROM project_members pm
                        INNER JOIN projects p ON p.id = pm.project_id
                        WHERE pm.employee_id = e.id AND p.manager_id = ?
                    )
                 )"
            );
            $stmt->bind_param("iisi", $id, $currentUser["id"], $currentUser["department"], $currentUser["id"]);
        } else {
            $stmt = $conn->prepare("SELECT $selectFields FROM employees WHERE id = ?");
            $stmt->bind_param("i", $id);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        $emp = $res->fetch_assoc();
        $stmt->close();

        if ($emp) {
            sendResponse(true, $emp);
        } else {
            sendResponse(false, null, "Employee not found", 404);
        }
    } else {
        if ($currentUser["role"] === "employee") {
            $stmt = $conn->prepare("SELECT $selectFields FROM employees WHERE department <=> ? ORDER BY id DESC");
            $stmt->bind_param("s", $currentUser["department"]);
            $stmt->execute();
            $result = $stmt->get_result();
        } elseif ($currentUser["role"] === "manager") {
            $stmt = $conn->prepare(
                "SELECT DISTINCT $selectFields FROM employees e
                 WHERE e.id = ? OR e.department <=> ? OR EXISTS (
                    SELECT 1 FROM project_members pm
                    INNER JOIN projects p ON p.id = pm.project_id
                    WHERE pm.employee_id = e.id AND p.manager_id = ?
                 )
                 ORDER BY e.id DESC"
            );
            $stmt->bind_param("isi", $currentUser["id"], $currentUser["department"], $currentUser["id"]);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $stmt = null;
            $result = $conn->query("SELECT $selectFields FROM employees ORDER BY id DESC");
        }

        if (!$result) {
            sendResponse(false, null, "Failed to fetch employees: " . $conn->error, 500);
        }

        $employees = [];
        while ($row = $result->fetch_assoc()) {
            if (empty($row["avatar"])) {
                $words = explode(" ", $row["name"]);
                $initials = "";
                foreach ($words as $w) {
                    if (!empty($w)) $initials .= strtoupper($w[0]);
                }
                $row["avatar"] = substr($initials, 0, 2);
            }
            $employees[] = $row;
        }

        if ($stmt) {
            $stmt->close();
        }
        sendResponse(true, $employees);
    }
}

// CREATE EMPLOYEE
if ($method === "POST") {
    $currentUser = requireAdmin();
    $data = getJsonInput();

    $code = trim($data["employee_code"] ?? "");
    $name = trim($data["name"] ?? "");
    $email = trim($data["email"] ?? "");
    $phone = trim($data["phone"] ?? "");
    $department = trim($data["department"] ?? "Engineering");
    $designation = trim($data["designation"] ?? "Staff");
    $role = trim($data["role"] ?? "employee");
    $status = trim($data["status"] ?? "Active");
    $salary = trim($data["salary"] ?? "$75,000");
    $joining_date = trim($data["joining_date"] ?? date("Y-m-d"));

    if (empty($name) || empty($email)) {
        sendResponse(false, null, "Name and Email are required", 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, null, "Enter a valid email address", 400);
    }
    if (!in_array($role, ["admin", "manager", "employee"], true)) {
        sendResponse(false, null, "Choose a valid access role", 400);
    }

    if (empty($code)) {
        $result = $conn->query("SELECT MAX(id) as max_id FROM employees");
        $maxRow = $result->fetch_assoc();
        $code = "EMP" . str_pad(($maxRow["max_id"] ?? 0) + 1, 3, "0", STR_PAD_LEFT);
    }

    $words = explode(" ", $name);
    $initials = "";
    foreach ($words as $w) {
        if (!empty($w)) $initials .= strtoupper($w[0]);
    }
    $avatar = substr($initials, 0, 2);

    $temporaryPassword = bin2hex(random_bytes(16));
    $passwordHash = password_hash($temporaryPassword, PASSWORD_DEFAULT);

    try {
        $conn->begin_transaction();
        $stmt = $conn->prepare("INSERT INTO employees (employee_code, name, email, phone, department, designation, role, status, salary, joining_date, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssssssss", $code, $name, $email, $phone, $department, $designation, $role, $status, $salary, $joining_date, $avatar);
        $stmt->execute();
        $newId = $stmt->insert_id;
        $stmt->close();

        $userStmt = $conn->prepare("INSERT INTO users (employee_id, email, password_hash, must_change_password) VALUES (?, ?, ?, 1)");
        $userStmt->bind_param("iss", $newId, $email, $passwordHash);
        $userStmt->execute();
        $userStmt->close();
        recordAudit($currentUser["user_id"], "employee.created", "employee", $newId, [
            "role" => $role,
            "department" => $department
        ]);
        $conn->commit();

        $stmt2 = $conn->prepare("SELECT id, employee_code, name, email, phone, department, designation, role, status, salary, avatar, joining_date, created_at FROM employees WHERE id = ?");
        $stmt2->bind_param("i", $newId);
        $stmt2->execute();
        $newEmp = $stmt2->get_result()->fetch_assoc();
        $stmt2->close();

        sendResponse(true, [
            "employee" => $newEmp,
            "temporary_password" => $temporaryPassword
        ], "Employee account created. Share the temporary password securely.", 201);
    } catch (Throwable $error) {
        $conn->rollback();
        error_log("Failed to create employee account: " . $error->getMessage());
        if ($error instanceof mysqli_sql_exception && $error->getCode() === 1062) {
            sendResponse(false, null, "That employee code or email is already in use", 409);
        }
        sendResponse(false, null, "Could not create the employee account", 500);
    }
}

// UPDATE EMPLOYEE
if ($method === "PUT") {
    $currentUser = requireAdmin();
    if ($id <= 0) {
        sendResponse(false, null, "Employee ID required", 400);
    }

    $data = getJsonInput();
    $name = trim($data["name"] ?? "");
    $email = trim($data["email"] ?? "");
    $phone = trim($data["phone"] ?? "");
    $department = trim($data["department"] ?? "");
    $designation = trim($data["designation"] ?? "");
    $role = trim($data["role"] ?? "employee");
    $status = trim($data["status"] ?? "Active");
    $salary = trim($data["salary"] ?? "");
    $joining_date = trim($data["joining_date"] ?? "");
    $employee_code = trim($data["employee_code"] ?? "");

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !in_array($role, ["admin", "manager", "employee"], true)) {
        sendResponse(false, null, "Enter a valid email address and role", 400);
    }

    try {
        $conn->begin_transaction();
        $stmt = $conn->prepare("UPDATE employees SET employee_code = ?, name = ?, email = ?, phone = ?, department = ?, designation = ?, role = ?, status = ?, salary = ?, joining_date = ? WHERE id = ?");
        $stmt->bind_param("ssssssssssi", $employee_code, $name, $email, $phone, $department, $designation, $role, $status, $salary, $joining_date, $id);
        $stmt->execute();
        $stmt->close();

        $userStmt = $conn->prepare("UPDATE users SET email = ? WHERE employee_id = ?");
        $userStmt->bind_param("si", $email, $id);
        $userStmt->execute();
        $userStmt->close();
        recordAudit($currentUser["user_id"], "employee.updated", "employee", $id, [
            "role" => $role,
            "department" => $department,
            "status" => $status
        ]);
        $conn->commit();

        $stmt2 = $conn->prepare("SELECT id, employee_code, name, email, phone, department, designation, role, status, salary, avatar, joining_date, created_at FROM employees WHERE id = ?");
        $stmt2->bind_param("i", $id);
        $stmt2->execute();
        $updatedEmp = $stmt2->get_result()->fetch_assoc();
        $stmt2->close();
        sendResponse(true, $updatedEmp, "Employee updated successfully");
    } catch (Throwable $error) {
        $conn->rollback();
        error_log("Failed to update employee account: " . $error->getMessage());
        if ($error instanceof mysqli_sql_exception && $error->getCode() === 1062) {
            sendResponse(false, null, "That employee code or email is already in use", 409);
        }
        sendResponse(false, null, "Could not update the employee account", 500);
    }
}

// TOGGLE STATUS
if ($method === "PATCH") {
    $currentUser = requireAdmin();
    if ($id <= 0) {
        sendResponse(false, null, "Employee ID required", 400);
    }

    $stmt = $conn->prepare("SELECT status FROM employees WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $curr = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$curr) {
        sendResponse(false, null, "Employee not found", 404);
    }

    $newStatus = ($curr["status"] === "Active") ? "Inactive" : "Active";

    $stmt2 = $conn->prepare("UPDATE employees SET status = ? WHERE id = ?");
    $stmt2->bind_param("si", $newStatus, $id);
    if ($stmt2->execute()) {
        $stmt2->close();
        recordAudit($currentUser["user_id"], "employee.status_changed", "employee", $id, [
            "from" => $curr["status"],
            "to" => $newStatus
        ]);
        sendResponse(true, ["id" => $id, "status" => $newStatus], "Status updated to " . $newStatus);
    } else {
        sendResponse(false, null, "Failed to toggle status", 500);
    }
}

// DELETE EMPLOYEE
if ($method === "DELETE") {
    $currentUser = requireAdmin();
    if ($id <= 0) {
        sendResponse(false, null, "Employee ID required", 400);
    }

    $historyRelations = [
        ["project_members", "employee_id"],
        ["tasks", "assignee_id"],
        ["attendance", "employee_id"],
        ["leaves", "employee_id"]
    ];
    foreach ($historyRelations as $relation) {
        $countStmt = $conn->prepare("SELECT id FROM " . $relation[0] . " WHERE " . $relation[1] . " = ? LIMIT 1");
        $countStmt->bind_param("i", $id);
        $countStmt->execute();
        $hasHistory = $countStmt->get_result()->num_rows > 0;
        $countStmt->close();
        if ($hasHistory) {
            sendResponse(false, null, "This employee has linked project, task, attendance, or leave history and cannot be deleted. Deactivate the account instead.", 409);
        }
    }

    try {
        $conn->begin_transaction();
        recordAudit($currentUser["user_id"], "employee.deleted", "employee", $id);
        $stmt = $conn->prepare("DELETE FROM employees WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        if ($stmt->affected_rows !== 1) {
            $stmt->close();
            $conn->rollback();
            sendResponse(false, null, "Employee not found", 404);
        }
        $stmt->close();
        $conn->commit();
        sendResponse(true, ["id" => $id], "Employee deleted successfully");
    } catch (Throwable $error) {
        $conn->rollback();
        error_log("Failed to delete employee: " . $error->getMessage());
        sendResponse(false, null, "Could not delete employee", 500);
    }
}

sendResponse(false, null, "Method not allowed", 405);
?>
