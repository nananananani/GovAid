package dao;

import java.sql.*;
import util.DBConnection;

public class ApplicationDAO {

    /**
     * Inserts the citizen's choice into the CitizenSchemeSelection bridging table.
     * Looks up the correct 'Applied' or 'Pending' status_id from metadata tables first.
     */
    public boolean applyForScheme(int citizenId, int schemeId) {
        String findStatusSql = "SELECT status_id FROM ApplicationStatus WHERE status_name IN ('Applied', 'Pending') ORDER BY status_id ASC LIMIT 1";
        String insertSql = "INSERT INTO CitizenSchemeSelection (citizen_id, scheme_id, application_date, status_id, remarks) VALUES (?, ?, CURDATE(), ?, 'Submitted via Portal Dashboard')";
        
        Connection conn = DBConnection.getConnection();
        if (conn == null) return false;

        try {
            int statusId = 1; // Fallback
            // Dynamic Status ID resolve
            try (Statement st = conn.createStatement(); ResultSet rs = st.executeQuery(findStatusSql)) {
                if(rs.next()) {
                    statusId = rs.getInt("status_id");
                }
            }

            // Insert Application mapping
            try (PreparedStatement ps = conn.prepareStatement(insertSql)) {
                ps.setInt(1, citizenId);
                ps.setInt(2, schemeId);
                ps.setInt(3, statusId);
                
                int rows = ps.executeUpdate();
                return rows > 0;
            }
        } catch (SQLException e) {
            System.err.println("Database Apply Error (Already Applied?): " + e.getMessage());
        }
        
        return false;
    }
}
