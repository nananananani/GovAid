package util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Utility class for establishing and managing MySQL JDBC Connection.
 */
public class DBConnection {
    // Database credentials and URL
    // Make sure GovAid_DB is created before running the application logic
    private static final String URL = "jdbc:mysql://localhost:3306/GovAid_DB?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
    private static final String USER = "root";
    private static final String PASSWORD = "password"; // TODO: Update with actual MySQL password

    private static Connection connection = null;

    private DBConnection() {
        // Private constructor to prevent instantiation
    }

    /**
     * Gets a singleton connection to the database.
     * @return Connection object
     */
    public static Connection getConnection() {
        try {
            if (connection == null || connection.isClosed()) {
                // Ensure the MySQL driver is loaded
                Class.forName("com.mysql.cj.jdbc.Driver");
                connection = DriverManager.getConnection(URL, USER, PASSWORD);
                System.out.println("Database Connection Successful!");
            }
        } catch (ClassNotFoundException e) {
            System.err.println("MySQL JDBC Driver not found. Ensure mysql-connector-java is in your classpath.");
            e.printStackTrace();
        } catch (SQLException e) {
            System.err.println("Database connection failed. Please verify details, DB status, and creation.");
            e.printStackTrace();
        }
        return connection;
    }

    /**
     * Closes the existing DB connection.
     */
    public static void closeConnection() {
        try {
            if (connection != null && !connection.isClosed()) {
                connection.close();
                System.out.println("Database Connection Closed.");
            }
        } catch (SQLException e) {
            System.err.println("Failed to close connection.");
            e.printStackTrace();
        }
    }
}
