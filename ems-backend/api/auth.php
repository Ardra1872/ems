<?php
require_once "../config/database.php";

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $user = requireAuth(true);
    unset($user["user_id"], $user["login_email"], $user["password_hash"]);
    sendResponse(true, $user, "Session restored");
}

if ($method === "POST") {
    $input = getJsonInput();
    $action = $input["action"] ?? "login";

    if ($action === "logout") {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), "", [
                "expires" => time() - 42000,
                "path" => $params["path"],
                "secure" => $params["secure"],
                "httponly" => $params["httponly"],
                "samesite" => $params["samesite"]
            ]);
        }
        session_destroy();
        sendResponse(true, null, "Signed out");
    }

    if ($action === "change_password") {
        $user = requireAuth(true);
        if (!$user["must_change_password"]) {
            sendResponse(false, null, "Password change is not required", 400);
        }

        $newPassword = $input["new_password"] ?? "";
        $confirmPassword = $input["confirm_password"] ?? "";
        if (!is_string($newPassword) || strlen($newPassword) < 12) {
            sendResponse(false, null, "Choose a password with at least 12 characters", 400);
        }
        if (!is_string($confirmPassword) || !hash_equals($newPassword, $confirmPassword)) {
            sendResponse(false, null, "The passwords do not match", 400);
        }

        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?");
        $stmt->bind_param("si", $hash, $user["user_id"]);
        if (!$stmt->execute()) {
            error_log("Failed to update user password: " . $stmt->error);
            $stmt->close();
            sendResponse(false, null, "Could not update your password", 500);
        }
        $stmt->close();

        $user["must_change_password"] = false;
        unset($user["user_id"], $user["login_email"], $user["password_hash"]);
        sendResponse(true, $user, "Password updated");
    }

    $email = trim($input["email"] ?? "");
    $password = $input["password"] ?? "";
    if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL) || !is_string($password) || $password === "") {
        sendResponse(false, null, "Email and password are required", 400);
    }

    $stmt = $conn->prepare("SELECT u.id AS user_id, u.email AS login_email, u.password_hash, u.must_change_password, e.id, e.employee_code, e.name, e.email, e.department, e.designation, e.role, e.status, e.phone, e.salary, e.avatar, e.joining_date FROM users u JOIN employees e ON e.id = u.employee_id WHERE u.email = ? LIMIT 1");
    if (!$stmt) {
        error_log("Failed to prepare login query: " . $conn->error);
        sendResponse(false, null, "Authentication service is unavailable", 500);
    }
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res->fetch_assoc();
    $stmt->close();

    if (!$user) {
        sendResponse(false, null, "Invalid credentials or user not found", 401);
    }

    if ($user["status"] === "Inactive") {
        sendResponse(false, null, "Your account is deactivated. Please contact an administrator.", 403);
    }

    $storedPassword = (string)$user["password_hash"];
    $validPassword = false;
    $validPassword = password_verify($password, $storedPassword);

    if (!$validPassword) {
        sendResponse(false, null, "Invalid email or password", 401);
    }

    session_regenerate_id(true);
    $_SESSION["user_id"] = intval($user["user_id"]);
    $user["must_change_password"] = (bool)$user["must_change_password"];
    unset($user["user_id"], $user["login_email"], $user["password_hash"]);
    sendResponse(true, ["user" => $user], "Login successful");
}

sendResponse(false, null, "Method not allowed", 405);
?>
