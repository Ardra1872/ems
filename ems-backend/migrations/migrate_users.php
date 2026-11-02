<?php
if (PHP_SAPI !== "cli") {
    http_response_code(404);
    exit;
}

require_once __DIR__ . "/../config/database.php";

$transactionStarted = false;
try {
    $conn->query(
        "CREATE TABLE IF NOT EXISTS users (
            id INT NOT NULL AUTO_INCREMENT,
            employee_id INT NOT NULL,
            email VARCHAR(100) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            must_change_password TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_users_employee_id (employee_id),
            UNIQUE KEY unique_users_email (email),
            CONSTRAINT fk_users_employee
                FOREIGN KEY (employee_id) REFERENCES employees (id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
    );

    $columnResult = $conn->query("SHOW COLUMNS FROM employees LIKE 'password'");
    $hasLegacyPasswords = $columnResult && $columnResult->num_rows > 0;
    if (!$hasLegacyPasswords) {
        $missingResult = $conn->query(
            "SELECT COUNT(*) AS missing_users
             FROM employees e
             LEFT JOIN users u ON u.employee_id = e.id
             WHERE u.id IS NULL"
        );
        $missingUsers = intval($missingResult->fetch_assoc()["missing_users"] ?? 0);
        if ($missingUsers > 0) {
            throw new RuntimeException("The legacy password column is missing but some employees have no user account.");
        }
        echo "User accounts are already migrated.\n";
        exit(0);
    }

    $employees = $conn->query("SELECT id, email, password FROM employees ORDER BY id");
    if (!$employees) {
        throw new RuntimeException("Could not read existing employee credentials.");
    }

    $conn->begin_transaction();
    $transactionStarted = true;
    $insert = $conn->prepare(
        "INSERT IGNORE INTO users (employee_id, email, password_hash, must_change_password)
         VALUES (?, ?, ?, 1)"
    );

    while ($employee = $employees->fetch_assoc()) {
        $legacyPassword = (string)($employee["password"] ?? "");
        if ($legacyPassword === "") {
            throw new RuntimeException(
                "Employee ID " . intval($employee["id"]) . " has no password. Set a temporary password before migrating."
            );
        }

        $employeeId = intval($employee["id"]);
        $email = $employee["email"];
        $passwordHash = password_hash($legacyPassword, PASSWORD_DEFAULT);
        $insert->bind_param("iss", $employeeId, $email, $passwordHash);
        $insert->execute();
    }
    $insert->close();

    $missingResult = $conn->query(
        "SELECT COUNT(*) AS missing_users
         FROM employees e
         LEFT JOIN users u ON u.employee_id = e.id
         WHERE u.id IS NULL"
    );
    $missingUsers = intval($missingResult->fetch_assoc()["missing_users"] ?? 0);
    if ($missingUsers > 0) {
        throw new RuntimeException("Some employee accounts could not be migrated. Check for duplicate email addresses.");
    }

    $conn->commit();
    $transactionStarted = false;
    $conn->query("ALTER TABLE employees DROP COLUMN password");
    echo "Migrated employee accounts to users with secure password hashes.\n";
    echo "All migrated users must change their password at their next sign in.\n";
} catch (Throwable $error) {
    if ($transactionStarted) {
        try {
            $conn->rollback();
        } catch (Throwable $rollbackError) {
            error_log("User migration rollback failed: " . $rollbackError->getMessage());
        }
    }
    fwrite(STDERR, "User migration failed: " . $error->getMessage() . "\n");
    exit(1);
}
