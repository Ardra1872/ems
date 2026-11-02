<?php
require_once "../config/database.php";

$currentUser = requireAuth();
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    sendResponse(false, null, "Method not allowed", 405);
}

function dashboardIds($result) {
    $ids = [];
    while ($row = $result->fetch_assoc()) {
        $ids[] = intval($row["id"]);
    }
    return array_values(array_unique($ids));
}

function dashboardIdList($ids) {
    $ids = array_values(array_filter(array_map("intval", $ids), function ($id) {
        return $id > 0;
    }));
    return empty($ids) ? "0" : implode(",", $ids);
}

if ($currentUser["role"] === "admin") {
    $employeeIds = dashboardIds($conn->query("SELECT id FROM employees"));
    $projectIds = dashboardIds($conn->query("SELECT id FROM projects"));
} elseif ($currentUser["role"] === "manager") {
    $employeeStmt = $conn->prepare(
        "SELECT DISTINCT e.id FROM employees e
         WHERE e.id = ? OR e.department <=> ? OR EXISTS (
            SELECT 1 FROM project_members pm
            INNER JOIN projects p ON p.id = pm.project_id
            WHERE pm.employee_id = e.id AND p.manager_id = ?
         )"
    );
    $employeeStmt->bind_param("isi", $currentUser["id"], $currentUser["department"], $currentUser["id"]);
    $employeeStmt->execute();
    $employeeIds = dashboardIds($employeeStmt->get_result());
    $employeeStmt->close();

    $projectStmt = $conn->prepare("SELECT id FROM projects WHERE manager_id = ?");
    $projectStmt->bind_param("i", $currentUser["id"]);
    $projectStmt->execute();
    $projectIds = dashboardIds($projectStmt->get_result());
    $projectStmt->close();
} else {
    $employeeIds = [intval($currentUser["id"])];
    $projectStmt = $conn->prepare(
        "SELECT p.id FROM projects p
         INNER JOIN project_members pm ON pm.project_id = p.id
         WHERE pm.employee_id = ?"
    );
    $projectStmt->bind_param("i", $currentUser["id"]);
    $projectStmt->execute();
    $projectIds = dashboardIds($projectStmt->get_result());
    $projectStmt->close();
}

$employeeList = dashboardIdList($employeeIds);
$projectList = dashboardIdList($projectIds);
$today = date("Y-m-d");

$empRes = $conn->query(
    "SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) AS inactive
     FROM employees WHERE id IN ($employeeList)"
);
$empRow = $empRes->fetch_assoc();
$totalEmployees = intval($empRow["total"] ?? 0);
$activeEmployees = intval($empRow["active"] ?? 0);
$inactiveEmployees = intval($empRow["inactive"] ?? 0);

$projRes = $conn->query(
    "SELECT COUNT(*) AS total,
        SUM(CASE WHEN status IN ('In Progress', 'Planning') THEN 1 ELSE 0 END) AS active_projects,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_projects
     FROM projects WHERE id IN ($projectList)"
);
$projRow = $projRes->fetch_assoc();
$totalProjects = intval($projRow["total"] ?? 0);
$activeProjects = intval($projRow["active_projects"] ?? 0);
$completedProjects = intval($projRow["completed_projects"] ?? 0);

$taskRes = $conn->query(
    "SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending
     FROM tasks WHERE " . ($currentUser["role"] === "employee"
         ? "assignee_id = " . intval($currentUser["id"])
         : "project_id IN ($projectList)")
);
$taskRow = $taskRes->fetch_assoc();
$totalTasks = intval($taskRow["total"] ?? 0);
$completedTasks = intval($taskRow["completed"] ?? 0);
$inProgressTasks = intval($taskRow["in_progress"] ?? 0);
$pendingTasks = intval($taskRow["pending"] ?? 0);
$taskCompletionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;

$attRes = $conn->query(
    "SELECT COUNT(*) AS present_today
     FROM attendance WHERE date = '$today' AND employee_id IN ($employeeList)
     AND status IN ('Present', 'Late')"
);
$attRow = $attRes->fetch_assoc();
$presentToday = intval($attRow["present_today"] ?? 0);
$attendanceRate = $activeEmployees > 0 ? round(($presentToday / $activeEmployees) * 100) : 0;

$weeklyTrends = [];
$trendsRes = $conn->query(
    "SELECT date, DAYNAME(date) AS day_name,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) AS leave_count
     FROM attendance
     WHERE employee_id IN ($employeeList)
     GROUP BY date ORDER BY date DESC LIMIT 5"
);
if ($trendsRes) {
    while ($row = $trendsRes->fetch_assoc()) {
        $weeklyTrends[] = [
            "day" => substr($row["day_name"], 0, 3),
            "present" => intval($row["present_count"]),
            "late" => intval($row["late_count"]),
            "absent" => intval($row["absent_count"]),
            "leave" => intval($row["leave_count"])
        ];
    }
    $weeklyTrends = array_reverse($weeklyTrends);
}

sendResponse(true, [
    "totalEmployees" => $totalEmployees,
    "activeEmployees" => $activeEmployees,
    "inactiveEmployees" => $inactiveEmployees,
    "totalProjects" => $totalProjects,
    "activeProjects" => $activeProjects,
    "completedProjects" => $completedProjects,
    "totalTasks" => $totalTasks,
    "completedTasks" => $completedTasks,
    "inProgressTasks" => $inProgressTasks,
    "pendingTasks" => $pendingTasks,
    "taskCompletionRate" => $taskCompletionRate,
    "presentToday" => $presentToday,
    "attendanceRate" => $attendanceRate,
    "weeklyTrends" => $weeklyTrends
]);
?>
