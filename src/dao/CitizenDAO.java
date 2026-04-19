package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Date;
import util.DBConnection;

/**
 * Data Access Object (DAO) for Citizen management.
 * Handles database operations for authenticating Citizens and registering new accounts.
 */
public class CitizenDAO {

    /**
     * Signs up a new citizen into the system natively supporting the new authentication mechanism.
     * Respects the UNIQUE constraints on email and aadhaar_number from the updated schema.
     * 
     * @return boolean true if successfully registered, false safely otherwise.
     */
    public boolean signupCitizen(String email, String passwordHash, String aadhaar, 
                                 String firstName, String lastName, Date dob, 
                                 String gender, double annualIncome, String occupation, 
                                 String street, String city, String pincode, String contactNum) {
                                     
        String sql = "INSERT INTO Citizen (email, password_hash, aadhaar_number, first_name, " +
                     "last_name, date_of_birth, gender, annual_income, occupation, " +
                     "street, city, state_of_residence, pincode, contact_number) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Tamil Nadu', ?, ?)";
        
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
             
            // Binding user authentication fields
            stmt.setString(1, email);
            stmt.setString(2, passwordHash);
            
            // Binding profile fields
            stmt.setString(3, aadhaar);
            stmt.setString(4, firstName);
            stmt.setString(5, lastName);
            stmt.setDate(6, dob);
            stmt.setString(7, gender);
            stmt.setDouble(8, annualIncome);
            stmt.setString(9, occupation);
            stmt.setString(10, street);
            stmt.setString(11, city);
            stmt.setString(12, pincode);
            stmt.setString(13, contactNum);
            
            int rowsInserted = stmt.executeUpdate();
            return rowsInserted > 0;
            
        } catch (SQLException e) {
            System.err.println("Citizen Signup Exception: Possible duplicate Email or Aadhaar usage.");
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Authenticates a Citizen during login using email and hashed password.
     * Uses the optimized 'idx_citizen_email' index created globally.
     * 
     * @return int representing citizen_id if valid, -1 if invalid or fails.
     */
    public int loginCitizen(String email, String passwordHash) {
        String sql = "SELECT citizen_id FROM Citizen WHERE email = ? AND password_hash = ?";
        
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
             
            stmt.setString(1, email);
            stmt.setString(2, passwordHash);
            
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("citizen_id"); // Citizen authorized
                }
            }
            
        } catch (SQLException e) {
            System.err.println("Login Database Error: " + e.getMessage());
        }
        
        return -1; // Unauthorized
    }
}
