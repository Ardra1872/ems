<?php
require_once "../config/database.php";

$currentUser = requireAuth();
$method = $_SERVER["REQUEST_METHOD"];
$id = isset($_GET["id"]) ? intval($_GET["id"]) : 0;

function getProjectTeamMembers($projectId) {
    global $conn;
    $stmt = $conn->prepare(
        "SELECT e.id, e.name, e.designation, e.role, e.status, e.avatar
         FROM project_members pm
         INNER JOIN employees e ON e.id = pm.employee_id
         WHERE pm.project_id = ? ORDER BY e.name"
    );
    $stmt->bind_param("i", $projectId);
    $stmt->execute();
    $result = $stmt->get_result();
    $members = [];
    while ($member = $result->fetch_assoc()) {
        $member["id"] = intval($member["id"]);
        $members[] = $member;
    }
    $stmt->close();
    return $members;
}

// GET ALL OR SINGLE PROJECT
if ($method === "GET") {
    if ($id > 0) {
        if ($currentUser["role"] === "employee") {
            $stmt = $conn->prepare("SELECT p.* FROM projects p INNER JOIN project_members pm ON pm.project_id = p.id WHERE p.id = ? AND pm.employee_id = ?");
            $stmt->bind_param("ii", $id, $currentUser["id"]);
        } elseif ($currentUser["role"] === "manager") {
            $stmt = $conn->prepare("SELECT * FROM projects WHERE id = ? AND manager_id = ?");
            $stmt->bind_param("ii", $id, $currentUser["id"]);
        } else {
            $stmt = $conn->prepare("SELECT * FROM projects WHERE id = ?");
            $stmt->bind_param("i", $id);
        }
        $stmt->execute();
        $proj = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($proj) {
            $proj["team_members"] = getProjectTeamMembers($id);
            $proj["team_ids"] = array_column($proj["team_members"], "id");

            sendResponse(true, $proj);
        } else {
            sendResponse(false, null, "Project not found", 404);
        }
    } else {
        if ($currentUser["role"] === "employee") {
            $stmt = $conn->prepare("SELECT p.* FROM projects p INNER JOIN project_members pm ON pm.project_id = p.id WHERE pm.employee_id = ? ORDER BY p.id DESC");
            $stmt->bind_param("i", $currentUser["id"]);
            $stmt->execute();
            $result = $stmt->get_result();
        } elseif ($currentUser["role"] === "manager") {
            $stmt = $conn->prepare("SELECT * FROM projects WHERE manager_id = ? ORDER BY id DESC");
            $stmt->bind_param("i", $currentUser["id"]);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query("SELECT * FROM projects ORDER BY id DESC");
        }

        $projects = [];
        while ($row = $result->fetch_assoc()) {
            $pId = intval($row["id"]);
            $row["team_members"] = getProjectTeamMembers($pId);
            $row["team_ids"] = array_column($row["team_members"], "id");
            $row["progress"] = intval($row["progress"]);
            $projects[] = $row;
        }
        if ($currentUser["role"] !== "admin") {
            $stmt->close();
        }

        sendResponse(true, $projects);
    }
}

// CREATE PROJECT
if ($method === "POST") {
    $currentUser = requireRole(["admin", "manager"]);
    $data = getJsonInput();

    $name = trim($data["name"] ?? "");
    $description = trim($data["description"] ?? "");
    $client = trim($data["client"] ?? "Internal Project");
    $manager_id = $currentUser["role"] === "manager"
        ? intval($currentUser["id"])
        : intval($data["manager_id"] ?? 0);
    $manager_name = $currentUser["role"] === "manager"
        ? $currentUser["name"]
        : trim($data["manager_name"] ?? "");
    $start_date = trim($data["start_date"] ?? date("Y-m-d"));
    $deadline = trim($data["deadline"] ?? "");
    $status = trim($data["status"] ?? "Planning");
    $priority = trim($data["priority"] ?? "Medium");
    $progress = intval($data["progress"] ?? 0);
    $team_ids = is_array($data["team_ids"] ?? null) ? $data["team_ids"] : [];

    if (empty($name)) {
        sendResponse(false, null, "Project name is required", 400);
    }
    if (!in_array($status, ["Planning", "In Progress", "On Hold", "Completed"], true) ||
        !in_array($priority, ["Low", "Medium", "High", "Urgent"], true) ||
        $progress < 0 || $progress > 100) {
        sendResponse(false, null, "Choose valid project status, priority, and progress values", 422);
    }
    if ($manager_id <= 0) {
        sendResponse(false, null, "A project manager is required", 422);
    }
    if ($currentUser["role"] === "admin") {
        $managerStmt = $conn->prepare("SELECT name FROM employees WHERE id = ? AND role = 'manager' AND status = 'Active'");
        $managerStmt->bind_param("i", $manager_id);
        $managerStmt->execute();
        $manager = $managerStmt->get_result()->fetch_assoc();
        $managerStmt->close();
        if (!$manager) {
            sendResponse(false, null, "Choose an active manager for this project", 422);
        }
        $manager_name = $manager["name"];
    }
    foreach ($team_ids as $employeeId) {
        $validatedId = filter_var($employeeId, FILTER_VALIDATE_INT);
        if ($validatedId === false || $validatedId <= 0) {
            sendResponse(false, null, "Invalid project team member", 422);
        }
        $activeStmt = $conn->prepare("SELECT id FROM employees WHERE id = ? AND status = 'Active'");
        $activeStmt->bind_param("i", $validatedId);
        $activeStmt->execute();
        $active = $activeStmt->get_result()->num_rows > 0;
        $activeStmt->close();
        if (!$active) {
            sendResponse(false, null, "Only active employees can be assigned to a project", 422);
        }
        if ($currentUser["role"] === "manager") {
            requireManagedEmployee(intval($validatedId), $currentUser);
        }
    }

    try {
        $conn->begin_transaction();
        $stmt = $conn->prepare("INSERT INTO projects (name, description, client, manager_id, manager_name, start_date, deadline, status, priority, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssisssssi", $name, $description, $client, $manager_id, $manager_name, $start_date, $deadline, $status, $priority, $progress);
        if (!$stmt->execute()) {
            throw new RuntimeException("Project insert failed: " . $stmt->error);
        }
        $newId = $stmt->insert_id;
        $stmt->close();

        if (!empty($team_ids)) {
            $insMem = $conn->prepare("INSERT IGNORE INTO project_members (project_id, employee_id) VALUES (?, ?)");
            foreach ($team_ids as $empId) {
                $eId = intval($empId);
                $insMem->bind_param("ii", $newId, $eId);
                if (!$insMem->execute()) {
                    throw new RuntimeException("Project squad insert failed: " . $insMem->error);
                }
            }
            $insMem->close();
        }

        recordAudit($currentUser["user_id"], "project.created", "project", $newId, [
            "name" => $name,
            "manager_id" => $manager_id,
            "team_ids" => array_map("intval", $team_ids)
        ]);
        $conn->commit();

        $resStmt = $conn->prepare("SELECT * FROM projects WHERE id = ?");
        $resStmt->bind_param("i", $newId);
        $resStmt->execute();
        $created = $resStmt->get_result()->fetch_assoc();
        $resStmt->close();
        $created["team_ids"] = array_map("intval", $team_ids);

        sendResponse(true, $created, "Project created successfully", 201);
    } catch (Throwable $error) {
        $conn->rollback();
        error_log("Failed to create project: " . $error->getMessage());
        sendResponse(false, null, "Could not create project", 500);
    }
}

// UPDATE PROJECT
if ($method === "PUT") {
    $currentUser = requireRole(["admin", "manager"]);
    if ($id <= 0) {
        sendResponse(false, null, "Project ID required", 400);
    }
    requireProjectManager($id, $currentUser);

    $data = getJsonInput();

    // Check if partial team update
    if (isset($data["team_ids"]) && count($data) === 1) {
        if (!is_array($data["team_ids"])) {
            sendResponse(false, null, "Team member IDs must be a list", 400);
        }

        $team_ids = [];
        foreach ($data["team_ids"] as $empId) {
            $validatedId = filter_var($empId, FILTER_VALIDATE_INT);
            if ($validatedId === false || $validatedId <= 0) {
                sendResponse(false, null, "Invalid team member ID", 400);
            }
            $team_ids[] = intval($validatedId);
        }
        $team_ids = array_values(array_unique($team_ids));

        $projectStmt = $conn->prepare("SELECT id FROM projects WHERE id = ?");
        $projectStmt->bind_param("i", $id);
        $projectStmt->execute();
        $projectExists = $projectStmt->get_result()->num_rows > 0;
        $projectStmt->close();
        if (!$projectExists) {
            sendResponse(false, null, "Project not found", 404);
        }

        $employeeStmt = $conn->prepare("SELECT id FROM employees WHERE id = ? AND status = 'Active'");
        $invalidEmployeeIds = [];
        foreach ($team_ids as $employeeId) {
            $employeeStmt->bind_param("i", $employeeId);
            $employeeStmt->execute();
            if ($employeeStmt->get_result()->num_rows === 0) {
                $invalidEmployeeIds[] = $employeeId;
            }
        }
        $employeeStmt->close();
        if (!empty($invalidEmployeeIds)) {
            sendResponse(
                false,
                ["employee_ids" => $invalidEmployeeIds],
                "Some selected employees are missing or inactive (IDs: " . implode(", ", $invalidEmployeeIds) . ")",
                400
            );
        }
        if ($currentUser["role"] === "manager") {
            foreach ($team_ids as $employeeId) {
                requireManagedEmployee($employeeId, $currentUser);
            }
        }

        try {
            $conn->begin_transaction();
            $deleteStmt = $conn->prepare("DELETE FROM project_members WHERE project_id = ?");
            $deleteStmt->bind_param("i", $id);
            $deleteStmt->execute();
            $deleteStmt->close();

            if (!empty($team_ids)) {
                $insertStmt = $conn->prepare("INSERT INTO project_members (project_id, employee_id) VALUES (?, ?)");
                foreach ($team_ids as $employeeId) {
                    $insertStmt->bind_param("ii", $id, $employeeId);
                    $insertStmt->execute();
                }
                $insertStmt->close();
            }

            recordAudit($currentUser["user_id"], "project.squad_updated", "project", $id, [
                "team_ids" => $team_ids
            ]);
            $conn->commit();
        } catch (Throwable $error) {
            $conn->rollback();
            error_log("Failed to update project squad: " . $error->getMessage());
            sendResponse(false, null, "Could not save the project squad", 500);
        }

        sendResponse(true, ["id" => $id, "team_ids" => $team_ids], "Team squad updated");
    }

    $name = trim($data["name"] ?? "");
    $description = trim($data["description"] ?? "");
    $client = trim($data["client"] ?? "");
    $manager_id = $currentUser["role"] === "manager"
        ? intval($currentUser["id"])
        : intval($data["manager_id"] ?? 0);
    $manager_name = $currentUser["role"] === "manager"
        ? $currentUser["name"]
        : trim($data["manager_name"] ?? "");
    $start_date = trim($data["start_date"] ?? "");
    $deadline = trim($data["deadline"] ?? "");
    $status = trim($data["status"] ?? "In Progress");
    $priority = trim($data["priority"] ?? "Medium");
    $progress = intval($data["progress"] ?? 0);
    $team_ids = is_array($data["team_ids"] ?? null) ? $data["team_ids"] : null;

    if (array_key_exists("team_ids", $data) && !is_array($data["team_ids"])) {
        sendResponse(false, null, "Team member IDs must be a list", 422);
    }
    if (!in_array($status, ["Planning", "In Progress", "On Hold", "Completed"], true) ||
        !in_array($priority, ["Low", "Medium", "High", "Urgent"], true) ||
        $progress < 0 || $progress > 100) {
        sendResponse(false, null, "Choose valid project status, priority, and progress values", 422);
    }
    if ($manager_id <= 0) {
        sendResponse(false, null, "A project manager is required", 422);
    }
    if ($currentUser["role"] === "admin") {
        $managerStmt = $conn->prepare("SELECT name FROM employees WHERE id = ? AND role = 'manager' AND status = 'Active'");
        $managerStmt->bind_param("i", $manager_id);
        $managerStmt->execute();
        $manager = $managerStmt->get_result()->fetch_assoc();
        $managerStmt->close();
        if (!$manager) {
            sendResponse(false, null, "Choose an active manager for this project", 422);
        }
        $manager_name = $manager["name"];
    }

    if ($team_ids !== null) {
        foreach ($team_ids as $employeeId) {
            $validatedId = filter_var($employeeId, FILTER_VALIDATE_INT);
            if ($validatedId === false || $validatedId <= 0) {
                sendResponse(false, null, "Invalid project team member", 422);
            }
            $activeStmt = $conn->prepare("SELECT id FROM employees WHERE id = ? AND status = 'Active'");
            $activeStmt->bind_param("i", $validatedId);
            $activeStmt->execute();
            $active = $activeStmt->get_result()->num_rows > 0;
            $activeStmt->close();
            if (!$active) {
                sendResponse(false, null, "Only active employees can be assigned to a project", 422);
            }
            if ($currentUser["role"] === "manager") {
                requireManagedEmployee(intval($validatedId), $currentUser);
            }
        }
    }

    try {
        $conn->begin_transaction();
        $stmt = $conn->prepare("UPDATE projects SET name = ?, description = ?, client = ?, manager_id = ?, manager_name = ?, start_date = ?, deadline = ?, status = ?, priority = ?, progress = ? WHERE id = ?");
        $stmt->bind_param("sssisssssii", $name, $description, $client, $manager_id, $manager_name, $start_date, $deadline, $status, $priority, $progress, $id);
        if (!$stmt->execute()) {
            throw new RuntimeException("Project update failed: " . $stmt->error);
        }
        $stmt->close();
        if ($team_ids !== null) {
            $deleteMembers = $conn->prepare("DELETE FROM project_members WHERE project_id = ?");
            $deleteMembers->bind_param("i", $id);
            if (!$deleteMembers->execute()) {
                throw new RuntimeException("Could not clear previous project squad: " . $deleteMembers->error);
            }
            $deleteMembers->close();
            if (!empty($team_ids)) {
                $insMem = $conn->prepare("INSERT IGNORE INTO project_members (project_id, employee_id) VALUES (?, ?)");
                foreach ($team_ids as $empId) {
                    $eId = intval($empId);
                    $insMem->bind_param("ii", $id, $eId);
                    if (!$insMem->execute()) {
                        throw new RuntimeException("Could not update project squad: " . $insMem->error);
                    }
                }
                $insMem->close();
            }
        }
        recordAudit($currentUser["user_id"], "project.updated", "project", $id, [
            "name" => $name,
            "manager_id" => $manager_id,
            "status" => $status,
            "priority" => $priority,
            "progress" => $progress,
            "team_ids" => $team_ids
        ]);
        $conn->commit();

        $resStmt = $conn->prepare("SELECT * FROM projects WHERE id = ?");
        $resStmt->bind_param("i", $id);
        $resStmt->execute();
        $updated = $resStmt->get_result()->fetch_assoc();
        $resStmt->close();
        $updated["team_ids"] = $team_ids === null
            ? array_column(getProjectTeamMembers($id), "id")
            : array_map("intval", $team_ids);

        sendResponse(true, $updated, "Project updated successfully");
    } catch (Throwable $error) {
        $conn->rollback();
        error_log("Failed to update project: " . $error->getMessage());
        sendResponse(false, null, "Could not update project", 500);
    }
}

// DELETE PROJECT
if ($method === "DELETE") {
    $currentUser = requireRole(["admin", "manager"]);
    if ($id <= 0) {
        sendResponse(false, null, "Project ID required", 400);
    }

    requireProjectManager($id, $currentUser);
    $taskStmt = $conn->prepare("SELECT id FROM tasks WHERE project_id = ? LIMIT 1");
    $taskStmt->bind_param("i", $id);
    $taskStmt->execute();
    $hasTasks = $taskStmt->get_result()->num_rows > 0;
    $taskStmt->close();
    if ($hasTasks) {
        sendResponse(false, null, "This project has task history and cannot be deleted", 409);
    }

    try {
        $conn->begin_transaction();
        $memberStmt = $conn->prepare("DELETE FROM project_members WHERE project_id = ?");
        $memberStmt->bind_param("i", $id);
        $memberStmt->execute();
        $memberStmt->close();

        $stmt = $conn->prepare("DELETE FROM projects WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        if ($stmt->affected_rows !== 1) {
            $stmt->close();
            $conn->rollback();
            sendResponse(false, null, "Project not found", 404);
        }
        $stmt->close();
        recordAudit($currentUser["user_id"], "project.deleted", "project", $id);
        $conn->commit();
        sendResponse(true, ["id" => $id], "Project deleted");
    } catch (Throwable $error) {
        $conn->rollback();
        error_log("Failed to delete project: " . $error->getMessage());
        sendResponse(false, null, "Could not delete the project", 500);
    }
}

sendResponse(false, null, "Method not allowed", 405);
?>
