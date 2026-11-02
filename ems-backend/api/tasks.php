<?php
require_once "../config/database.php";

$currentUser = requireAuth();
$method = $_SERVER["REQUEST_METHOD"];
$id = isset($_GET["id"]) ? intval($_GET["id"]) : 0;

function findTask($taskId) {
    global $conn;
    $stmt = $conn->prepare("SELECT * FROM tasks WHERE id = ? LIMIT 1");
    $stmt->bind_param("i", $taskId);
    $stmt->execute();
    $task = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $task;
}

function requireTaskInManagerScope($task, $user) {
    if (!$task) {
        sendResponse(false, null, "Task not found", 404);
    }
    requireProjectManager(intval($task["project_id"]), $user);
}

function validateTaskAssignment($projectId, $assigneeId, $user) {
    global $conn;

    $projectStmt = $conn->prepare("SELECT id FROM projects WHERE id = ? LIMIT 1");
    $projectStmt->bind_param("i", $projectId);
    $projectStmt->execute();
    $projectExists = $projectStmt->get_result()->num_rows > 0;
    $projectStmt->close();
    if (!$projectExists) {
        sendResponse(false, null, "Select a valid project", 422);
    }

    if ($user["role"] === "manager") {
        requireProjectManager($projectId, $user);
    }
    requireProjectMember($projectId, $assigneeId);
}

function validateTaskDeadline($deadline, $notBefore = null) {
    if ($deadline === "") {
        return;
    }
    $date = DateTime::createFromFormat("!Y-m-d", $deadline);
    $minimumDate = $notBefore ?? date("Y-m-d");
    if (!$date || $date->format("Y-m-d") !== $deadline || $deadline < $minimumDate) {
        sendResponse(false, null, "Task deadline must be a valid date no earlier than its allowed start date", 422);
    }
}

if ($method === "GET") {
    if ($id > 0) {
        $task = findTask($id);
        if (!$task) {
            sendResponse(false, null, "Task not found", 404);
        }
        if ($currentUser["role"] === "employee" && intval($task["assignee_id"]) !== intval($currentUser["id"])) {
            sendResponse(false, null, "Task not found", 404);
        }
        if ($currentUser["role"] === "manager") {
            requireTaskInManagerScope($task, $currentUser);
        }
        sendResponse(true, $task);
    }

    if ($currentUser["role"] === "admin") {
        $dateFilter = getDateRangeFilter("created_at");
        $result = $conn->query("SELECT * FROM tasks WHERE 1=1$dateFilter ORDER BY id DESC");
    } elseif ($currentUser["role"] === "manager") {
        $dateFilter = getDateRangeFilter("t.created_at");
        $stmt = $conn->prepare(
            "SELECT t.* FROM tasks t
             INNER JOIN projects p ON p.id = t.project_id
             WHERE p.manager_id = ?$dateFilter ORDER BY t.id DESC"
        );
        $stmt->bind_param("i", $currentUser["id"]);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $dateFilter = getDateRangeFilter("created_at");
        $stmt = $conn->prepare("SELECT * FROM tasks WHERE assignee_id = ?$dateFilter ORDER BY id DESC");
        $stmt->bind_param("i", $currentUser["id"]);
        $stmt->execute();
        $result = $stmt->get_result();
    }

    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $row["id"] = intval($row["id"]);
        $row["project_id"] = intval($row["project_id"]);
        $row["assignee_id"] = intval($row["assignee_id"]);
        $tasks[] = $row;
    }
    if (isset($stmt)) {
        $stmt->close();
    }
    sendResponse(true, $tasks);
}

if ($method === "POST") {
    requireRole(["admin", "manager"]);
    $data = getJsonInput();

    $title = trim($data["title"] ?? "");
    $description = trim($data["description"] ?? "");
    $projectId = filter_var($data["project_id"] ?? null, FILTER_VALIDATE_INT);
    $assigneeId = filter_var($data["assignee_id"] ?? null, FILTER_VALIDATE_INT);
    $priority = trim($data["priority"] ?? "Medium");
    $status = trim($data["status"] ?? "Pending");
    $deadline = trim($data["deadline"] ?? "");
    $allowedPriorities = ["Low", "Medium", "High", "Urgent"];
    $allowedStatuses = ["Pending", "In Progress", "Completed"];

    if ($title === "" || $projectId === false || $projectId <= 0 || $assigneeId === false || $assigneeId <= 0) {
        sendResponse(false, null, "Task title, valid project, and assignee are required", 422);
    }
    if (!in_array($priority, $allowedPriorities, true) || !in_array($status, $allowedStatuses, true)) {
        sendResponse(false, null, "Choose a valid task priority and status", 422);
    }
    validateTaskDeadline($deadline);
    validateTaskAssignment($projectId, $assigneeId, $currentUser);

    $projectStmt = $conn->prepare("SELECT name FROM projects WHERE id = ?");
    $projectStmt->bind_param("i", $projectId);
    $projectStmt->execute();
    $projectName = $projectStmt->get_result()->fetch_assoc()["name"];
    $projectStmt->close();

    $employeeStmt = $conn->prepare("SELECT name FROM employees WHERE id = ? AND status = 'Active'");
    $employeeStmt->bind_param("i", $assigneeId);
    $employeeStmt->execute();
    $assigneeName = $employeeStmt->get_result()->fetch_assoc()["name"];
    $employeeStmt->close();

    try {
        $conn->begin_transaction();
        $stmt = $conn->prepare(
            "INSERT INTO tasks (title, description, project_id, project_name, assignee_id, assignee_name, priority, status, deadline)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("ssisissss", $title, $description, $projectId, $projectName, $assigneeId, $assigneeName, $priority, $status, $deadline);
        if (!$stmt->execute()) {
            throw new RuntimeException("Task insert failed: " . $stmt->error);
        }
        $newId = $stmt->insert_id;
        $stmt->close();
        recordAudit($currentUser["user_id"], "task.created", "task", $newId, [
            "project_id" => $projectId,
            "assignee_id" => $assigneeId,
            "priority" => $priority
        ]);
        $conn->commit();
    } catch (Throwable $error) {
        $conn->rollback();
        error_log("Failed to create task: " . $error->getMessage());
        sendResponse(false, null, "Could not create task", 500);
    }
    sendResponse(true, findTask($newId), "Task created successfully", 201);
}

if ($method === "PUT") {
    $currentUser = requireRole(["admin", "manager"]);
    if ($id <= 0) {
        sendResponse(false, null, "Task ID required", 422);
    }
    $task = findTask($id);
    if (!$task) {
        sendResponse(false, null, "Task not found", 404);
    }
    if ($currentUser["role"] === "manager") {
        requireTaskInManagerScope($task, $currentUser);
    }

    $data = getJsonInput();
    $title = trim($data["title"] ?? "");
    $description = trim($data["description"] ?? "");
    $projectId = filter_var($data["project_id"] ?? null, FILTER_VALIDATE_INT);
    $assigneeId = filter_var($data["assignee_id"] ?? null, FILTER_VALIDATE_INT);
    $priority = trim($data["priority"] ?? "Medium");
    $status = trim($data["status"] ?? "Pending");
    $deadline = trim($data["deadline"] ?? "");
    $allowedPriorities = ["Low", "Medium", "High", "Urgent"];
    $allowedStatuses = ["Pending", "In Progress", "Completed"];

    if ($title === "" || $projectId === false || $projectId <= 0 || $assigneeId === false || $assigneeId <= 0) {
        sendResponse(false, null, "Task title, valid project, and assignee are required", 422);
    }
    if (!in_array($priority, $allowedPriorities, true) || !in_array($status, $allowedStatuses, true)) {
        sendResponse(false, null, "Choose a valid task priority and status", 422);
    }
    validateTaskDeadline($deadline, substr($task["created_at"] ?? date("Y-m-d"), 0, 10));
    validateTaskAssignment($projectId, $assigneeId, $currentUser);

    $projectStmt = $conn->prepare("SELECT name FROM projects WHERE id = ?");
    $projectStmt->bind_param("i", $projectId);
    $projectStmt->execute();
    $projectName = $projectStmt->get_result()->fetch_assoc()["name"];
    $projectStmt->close();
    $employeeStmt = $conn->prepare("SELECT name FROM employees WHERE id = ? AND status = 'Active'");
    $employeeStmt->bind_param("i", $assigneeId);
    $employeeStmt->execute();
    $assigneeName = $employeeStmt->get_result()->fetch_assoc()["name"];
    $employeeStmt->close();

    try {
        $conn->begin_transaction();
        $stmt = $conn->prepare(
            "UPDATE tasks SET title = ?, description = ?, project_id = ?, project_name = ?,
             assignee_id = ?, assignee_name = ?, priority = ?, status = ?, deadline = ? WHERE id = ?"
        );
        $stmt->bind_param("ssisissssi", $title, $description, $projectId, $projectName, $assigneeId, $assigneeName, $priority, $status, $deadline, $id);
        if (!$stmt->execute()) {
            throw new RuntimeException("Task update failed: " . $stmt->error);
        }
        $stmt->close();
        recordAudit($currentUser["user_id"], "task.updated", "task", $id, [
            "previous_assignee_id" => intval($task["assignee_id"]),
            "previous_status" => $task["status"],
            "project_id" => $projectId,
            "assignee_id" => $assigneeId,
            "priority" => $priority,
            "status" => $status
        ]);
        $conn->commit();
    } catch (Throwable $error) {
        $conn->rollback();
        error_log("Failed to update task: " . $error->getMessage());
        sendResponse(false, null, "Could not update task", 500);
    }
    sendResponse(true, findTask($id), "Task updated successfully");
}

if ($method === "PATCH") {
    if ($id <= 0) {
        sendResponse(false, null, "Task ID required", 422);
    }
    $task = findTask($id);
    if (!$task) {
        sendResponse(false, null, "Task not found", 404);
    }
    $data = getJsonInput();
    if (count($data) !== 1 || !isset($data["status"])) {
        sendResponse(false, null, "Only task status can be updated through this operation", 422);
    }
    $nextStatus = trim($data["status"]);
    $validStatuses = ["Pending", "In Progress", "Completed"];
    if (!in_array($nextStatus, $validStatuses, true)) {
        sendResponse(false, null, "Choose a valid task status", 422);
    }

    if ($currentUser["role"] === "employee") {
        if (intval($task["assignee_id"]) !== intval($currentUser["id"])) {
            sendResponse(false, null, "Task not found", 404);
        }
        $allowedTransitions = [
            "Pending" => "In Progress",
            "In Progress" => "Completed",
            "Completed" => null
        ];
        if ($allowedTransitions[$task["status"]] !== $nextStatus) {
            sendResponse(false, null, "Employees can only move their task from Pending to In Progress to Completed", 422);
        }
    } elseif ($currentUser["role"] === "manager") {
        requireTaskInManagerScope($task, $currentUser);
    } elseif ($currentUser["role"] !== "admin") {
        sendResponse(false, null, "You do not have permission to update task status", 403);
    }

    try {
        $conn->begin_transaction();
        $stmt = $conn->prepare("UPDATE tasks SET status = ? WHERE id = ?");
        $stmt->bind_param("si", $nextStatus, $id);
        if (!$stmt->execute()) {
            throw new RuntimeException("Task status update failed: " . $stmt->error);
        }
        $stmt->close();
        recordAudit($currentUser["user_id"], "task.status_changed", "task", $id, [
            "from" => $task["status"],
            "to" => $nextStatus
        ]);
        $conn->commit();
    } catch (Throwable $error) {
        $conn->rollback();
        error_log("Failed to update task status: " . $error->getMessage());
        sendResponse(false, null, "Could not update task status", 500);
    }
    sendResponse(true, ["id" => $id, "status" => $nextStatus], "Task status updated");
}

if ($method === "DELETE") {
    $currentUser = requireRole(["admin", "manager"]);
    if ($id <= 0) {
        sendResponse(false, null, "Task ID required", 422);
    }
    $task = findTask($id);
    if (!$task) {
        sendResponse(false, null, "Task not found", 404);
    }
    if ($currentUser["role"] === "manager") {
        requireTaskInManagerScope($task, $currentUser);
    }
    if ($task["status"] === "Completed") {
        sendResponse(false, null, "Completed tasks are retained for reporting and cannot be deleted", 409);
    }
    try {
        $conn->begin_transaction();
        recordAudit($currentUser["user_id"], "task.deleted", "task", $id, [
            "title" => $task["title"],
            "project_id" => intval($task["project_id"]),
            "assignee_id" => intval($task["assignee_id"])
        ]);
        $stmt = $conn->prepare("DELETE FROM tasks WHERE id = ?");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute() || $stmt->affected_rows !== 1) {
            throw new RuntimeException("Task deletion failed: " . $stmt->error);
        }
        $stmt->close();
        $conn->commit();
    } catch (Throwable $error) {
        $conn->rollback();
        error_log("Failed to delete task: " . $error->getMessage());
        sendResponse(false, null, "Could not delete task", 500);
    }
    sendResponse(true, ["id" => $id], "Task deleted");
}

sendResponse(false, null, "Method not allowed", 405);
?>
