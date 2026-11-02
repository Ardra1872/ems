<?php

// CORS and Response Headers
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

$allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
];
$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if ($origin !== "" && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
    header("Vary: Origin");
} elseif ($origin !== "") {
    http_response_code(403);
    echo json_encode(["success" => false, "data" => null, "message" => "Origin is not allowed"]);
    exit;
}

if (($_SERVER["REQUEST_METHOD"] ?? "") === "OPTIONS") {
    http_response_code(204);
    exit;
}

if (PHP_SAPI !== "cli") {
    session_name("EMSSESSID");
    session_set_cookie_params([
        "lifetime" => 0,
        "path" => "/",
        "secure" => !empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off",
        "httponly" => true,
        "samesite" => "Lax"
    ]);
    session_start();
}

$host = "localhost";
$username = "root";
$password = "";
$database = "ems";

$conn = new mysqli(
    $host,
    $username,
    $password,
    $database
);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode([
        "success" => false,
        "message" => "Database connection failed: " . $conn->connect_error
    ]));
}

$conn->set_charset("utf8mb4");

function sendResponse($success, $data = null, $message = "", $code = 200) {
    http_response_code($code);
    echo json_encode([
        "success" => $success,
        "data" => $data,
        "message" => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonInput() {
    $raw = file_get_contents("php://input");
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function getAuthenticatedUser() {
    global $conn;

    $userId = intval($_SESSION["user_id"] ?? 0);
    if ($userId <= 0) {
        return null;
    }

    $stmt = $conn->prepare("SELECT u.id AS user_id, u.email AS login_email, u.password_hash, u.must_change_password, e.id, e.employee_code, e.name, e.email, e.department, e.designation, e.role, e.status, e.phone, e.salary, e.avatar, e.joining_date FROM users u JOIN employees e ON e.id = u.employee_id WHERE u.id = ? LIMIT 1");
    if (!$stmt) {
        error_log("Failed to prepare authenticated user query: " . $conn->error);
        sendResponse(false, null, "Authentication service is unavailable", 500);
    }
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user || $user["status"] !== "Active") {
        $_SESSION = [];
        session_destroy();
        return null;
    }

    $user["must_change_password"] = (bool)$user["must_change_password"];
    return $user;
}

function requireAuth($allowPasswordChange = false) {
    $user = getAuthenticatedUser();
    if (!$user) {
        sendResponse(false, null, "Please sign in to continue", 401);
    }
    if (!$allowPasswordChange && $user["must_change_password"]) {
        sendResponse(false, null, "You must change your temporary password before continuing", 403);
    }
    return $user;
}

function requireAdmin() {
    $user = requireAuth();
    if ($user["role"] !== "admin") {
        sendResponse(false, null, "Only administrators can manage employee accounts", 403);
    }
    return $user;
}

function requireRole($roles) {
    $user = requireAuth();
    $roles = is_array($roles) ? $roles : [$roles];
    if (!in_array($user["role"], $roles, true)) {
        sendResponse(false, null, "You do not have permission to perform this action", 403);
    }
    return $user;
}

function requireProjectManager($projectId, $user = null) {
    global $conn;

    $user = $user ?? requireAuth();
    if ($user["role"] === "admin") {
        return true;
    }
    if ($user["role"] !== "manager") {
        sendResponse(false, null, "You do not have permission to manage this project", 403);
    }

    $stmt = $conn->prepare("SELECT id FROM projects WHERE id = ? AND manager_id = ? LIMIT 1");
    $stmt->bind_param("ii", $projectId, $user["id"]);
    $stmt->execute();
    $allowed = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    if (!$allowed) {
        sendResponse(false, null, "Project not found or access denied", 404);
    }
    return true;
}

function requireManagedEmployee($employeeId, $user = null) {
    global $conn;

    $user = $user ?? requireAuth();
    if ($user["role"] === "admin" || intval($employeeId) === intval($user["id"])) {
        return true;
    }
    if ($user["role"] !== "manager") {
        sendResponse(false, null, "You do not have permission to access this employee", 403);
    }

    $stmt = $conn->prepare(
        "SELECT e.id
         FROM employees e
         WHERE e.id = ? AND (
            e.department <=> ? OR EXISTS (
                SELECT 1 FROM project_members pm
                INNER JOIN projects p ON p.id = pm.project_id
                WHERE pm.employee_id = e.id AND p.manager_id = ?
            )
         )
         LIMIT 1"
    );
    $stmt->bind_param("isi", $employeeId, $user["department"], $user["id"]);
    $stmt->execute();
    $allowed = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    if (!$allowed) {
        sendResponse(false, null, "Employee not found or access denied", 404);
    }
    return true;
}

function requireProjectMember($projectId, $employeeId) {
    global $conn;

    $stmt = $conn->prepare(
        "SELECT pm.employee_id
         FROM project_members pm
         INNER JOIN employees e ON e.id = pm.employee_id
         WHERE pm.project_id = ? AND pm.employee_id = ? AND e.status = 'Active'
         LIMIT 1"
    );
    $stmt->bind_param("ii", $projectId, $employeeId);
    $stmt->execute();
    $allowed = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    if (!$allowed) {
        sendResponse(false, null, "The assignee must be an active member of this project", 422);
    }
    return true;
}

function getDateRangeFilter($column) {
    $from = $_GET["from"] ?? "";
    $to = $_GET["to"] ?? "";
    if ($from === "" && $to === "") {
        return "";
    }
    if (!is_string($from) || !is_string($to)) {
        sendResponse(false, null, "A valid date range is required", 422);
    }
    if ($from === "" || $to === "") {
        sendResponse(false, null, "Both date range boundaries are required", 422);
    }

    $fromDate = DateTime::createFromFormat("!Y-m-d", $from);
    $toDate = DateTime::createFromFormat("!Y-m-d", $to);
    if (!$fromDate || $fromDate->format("Y-m-d") !== $from ||
        !$toDate || $toDate->format("Y-m-d") !== $to || $from > $to) {
        sendResponse(false, null, "A valid date range is required", 422);
    }

    return " AND $column >= '$from' AND $column < DATE_ADD('$to', INTERVAL 1 DAY)";
}

function recordAudit($actorUserId, $action, $entityType, $entityId, $details = []) {
    global $conn;

    $detailsJson = json_encode($details, JSON_UNESCAPED_UNICODE);
    $stmt = $conn->prepare(
        "INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
         VALUES (?, ?, ?, ?, ?)"
    );
    if (!$stmt) {
        error_log("Failed to prepare audit log insert: " . $conn->error);
        sendResponse(false, null, "Audit logging is unavailable; the operation was not completed", 500);
    }
    $stmt->bind_param("issis", $actorUserId, $action, $entityType, $entityId, $detailsJson);
    if (!$stmt->execute()) {
        error_log("Failed to write audit log: " . $stmt->error);
        $stmt->close();
        sendResponse(false, null, "Could not record this operation; it was not completed", 500);
    }
    $stmt->close();
    return true;
}
?>
