package service;

import util.DBConnection;
import java.sql.*;

public class EligibilityEngine {

    public static String getEligibleSchemesJSON(int citizenId) {
        StringBuilder json = new StringBuilder("[");
        String sql = "SELECT s.scheme_id, s.scheme_name, s.official_description, s.simplified_description, s.authority_id, s.tenure, " +
                     "b.benefit_type, b.benefit_amount, b.benefit_description, " +
                     "c.date_of_birth, c.annual_income, c.gender, c.occupation, c.state_of_residence, " +
                     "e.min_age, e.max_age, e.min_income, e.max_income, e.required_gender, e.required_occupation, " +
                     "(SELECT GROUP_CONCAT(cat.category_name SEPARATOR ', ') FROM SchemeCategory sc JOIN Category cat ON sc.category_id = cat.category_id WHERE sc.scheme_id = s.scheme_id) as categories " +
                     "FROM Citizen c " +
                     "CROSS JOIN Scheme s " +
                     "LEFT JOIN EligibilityCriteria e ON s.scheme_id = e.scheme_id " +
                     "LEFT JOIN Benefit b ON s.scheme_id = b.scheme_id " +
                     "WHERE c.citizen_id = ? AND s.status = 'ACTIVE'";
                     
        Connection conn = DBConnection.getConnection();
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, citizenId);
            ResultSet rs = pstmt.executeQuery();
            boolean first = true;
            while(rs.next()) {
                Date dob = rs.getDate("date_of_birth");
                double income = rs.getDouble("annual_income");
                String gender = rs.getString("gender");
                String occupation = rs.getString("occupation");
                String state = rs.getString("state_of_residence");
                
                int age = java.time.Period.between(dob.toLocalDate(), java.time.LocalDate.now()).getYears();
                
                int schemeId = rs.getInt("scheme_id");
                String schemeName = rs.getString("scheme_name");
                String desc = rs.getString("simplified_description");
                String offDesc = rs.getString("official_description");
                String tenure = rs.getString("tenure");
                int authId = rs.getInt("authority_id");
                String benefitAmount = rs.getString("benefit_amount");
                String benefitDesc = (benefitAmount != null && !benefitAmount.equals("0.00")) ? "₹ " + benefitAmount : rs.getString("benefit_description");
                String categories = rs.getString("categories") != null ? rs.getString("categories") : "General";
                
                int minAge = rs.getInt("min_age");
                int maxAge = rs.getObject("max_age") != null ? rs.getInt("max_age") : 150;
                double minIncome = rs.getDouble("min_income");
                double maxIncome = rs.getObject("max_income") != null ? rs.getDouble("max_income") : Double.MAX_VALUE;
                String reqGender = rs.getString("required_gender");
                String reqOcc = rs.getString("required_occupation");

                boolean eligible = true;
                if (age < minAge || age > maxAge) eligible = false;
                if (income < minIncome || income > maxIncome) eligible = false;
                if (reqGender != null && !reqGender.equals("ANY") && !reqGender.equalsIgnoreCase(gender)) eligible = false;
                if (reqOcc != null && !reqOcc.isEmpty() && !reqOcc.equalsIgnoreCase(occupation)) eligible = false;
                if (authId == 2 && state != null && !state.toLowerCase().contains("tamil nadu")) eligible = false;
                
                if(eligible) {
                    String criteriaList = "<ul>" +
                        "<li>Age Limit: " + minAge + " to " + (maxAge >= 150 ? "Any" : maxAge) + "</li>" +
                        "<li>Max Annual Income: " + (maxIncome > 99999999 ? "No limit" : "₹" + maxIncome) + "</li>" +
                        (reqGender != null && !reqGender.equals("ANY") ? "<li>Exclusive to: " + reqGender + "</li>" : "") +
                        ((authId == 2) ? "<li>Region: Tamil Nadu Residence</li>" : "") +
                        "</ul>";
                    
                    if (!first) json.append(",");
                    json.append("{")
                        .append("\"id\":").append(schemeId).append(",")
                        .append("\"name\":\"").append(escape(schemeName)).append("\",")
                        .append("\"auth\":\"").append(authId == 1 ? "Central Govt" : "Tamil Nadu Govt").append("\",")
                        .append("\"authClass\":\"").append(authId == 1 ? "badge-central" : "badge-state").append("\",")
                        .append("\"benefit\":\"").append(escape(benefitDesc)).append("\",")
                        .append("\"desc\":\"").append(escape(desc)).append("\",")
                        .append("\"offDesc\":\"").append(escape(offDesc)).append("\",")
                        .append("\"tenure\":\"").append(tenure != null ? escape(tenure) : "Lifetime").append("\",")
                        .append("\"categories\":\"").append(escape(categories)).append("\",")
                        .append("\"criteriaHtml\":\"").append(escape(criteriaList)).append("\",")
                        .append("\"reason\":\"Profile Matched\",")
                        .append("\"is_eligible\":true")
                        .append("}");
                    first = false;
                }
            }
        } catch (Exception e) {}
        json.append("]");
        return json.toString();
    }
    
    public static String getAllSchemesJSON(int citizenId) {
        StringBuilder json = new StringBuilder("[");
        String sql = "SELECT s.scheme_id, s.scheme_name, s.official_description, s.simplified_description, s.authority_id, s.tenure, " +
                     "b.benefit_type, b.benefit_amount, b.benefit_description, " +
                     "e.min_age, e.max_age, e.min_income, e.max_income, e.required_gender, e.required_occupation, " +
                     "(SELECT GROUP_CONCAT(cat.category_name SEPARATOR ', ') FROM SchemeCategory sc JOIN Category cat ON sc.category_id = cat.category_id WHERE sc.scheme_id = s.scheme_id) as categories, " +
                     "c.date_of_birth, c.annual_income, c.gender, c.occupation, c.state_of_residence " +
                     "FROM Scheme s " +
                     "LEFT JOIN Benefit b ON s.scheme_id = b.scheme_id " +
                     "LEFT JOIN EligibilityCriteria e ON s.scheme_id = e.scheme_id " +
                     "LEFT JOIN Citizen c ON c.citizen_id = ? " +
                     "WHERE s.status = 'ACTIVE'";
                     
        Connection conn = DBConnection.getConnection();
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, citizenId);
            ResultSet rs = pstmt.executeQuery();
            boolean first = true;
            while(rs.next()) {
                int authId = rs.getInt("authority_id");
                String schemeName = rs.getString("scheme_name");
                String benefitAmount = rs.getString("benefit_amount");
                String offDesc = rs.getString("official_description");
                String tenure = rs.getString("tenure");
                String benefitDesc = (benefitAmount != null && !benefitAmount.equals("0.00")) ? "₹ " + benefitAmount : rs.getString("benefit_description");
                String category_list = rs.getString("categories") != null ? rs.getString("categories") : "General";
                
                int minAge = rs.getInt("min_age");
                int maxAge = rs.getObject("max_age") != null ? rs.getInt("max_age") : 150;
                double maxIncome = rs.getObject("max_income") != null ? rs.getDouble("max_income") : Double.MAX_VALUE;
                String reqGender = rs.getString("required_gender");
                String reqOcc = rs.getString("required_occupation");

                boolean is_eligible = true;
                String reason = "Profile Matched";

                if (citizenId > 0) {
                    Date dob = rs.getDate("date_of_birth");
                    int age = java.time.Period.between(dob.toLocalDate(), java.time.LocalDate.now()).getYears();
                    double income = rs.getDouble("annual_income");
                    String gender = rs.getString("gender");
                    String occ = rs.getString("occupation");
                    String state = rs.getString("state_of_residence");

                    String userOcc = (occ != null ? occ : "").toUpperCase();
                    String reqOccVal = (reqOcc != null ? reqOcc : "").toUpperCase();
                    boolean occPass = reqOccVal.isEmpty() || reqOccVal.equals("ANY") || userOcc.contains(reqOccVal) || reqOccVal.contains(userOcc);

                    if (age < minAge) { is_eligible = false; reason = "Min age " + minAge + " required."; }
                    else if (age > maxAge) { is_eligible = false; reason = "Must be below age " + maxAge + "."; }
                    else if (income > maxIncome) { is_eligible = false; reason = "Income limit ₹" + (int)maxIncome + " exceeded."; }
                    else if (reqGender != null && !reqGender.equals("ANY") && !reqGender.equalsIgnoreCase(gender)) { is_eligible = false; reason = "Requires " + reqGender + " gender."; }
                    else if (!occPass) { is_eligible = false; reason = "Requires " + reqOcc + " occupation."; }
                    else if (authId == 2 && state != null && !state.toLowerCase().contains("tamil nadu")) { is_eligible = false; reason = "Requires TN residency."; }

                }

                String criteriaList = "<ul>" +
                        "<li>Age Limit: " + minAge + " to " + (maxAge >= 150 ? "Any" : maxAge) + "</li>" +
                        "<li>Income Limit: " + (maxIncome > 99999999 ? "No limit" : "₹" + (int)maxIncome) + "</li>" +
                        (reqGender != null && !reqGender.equals("ANY") ? "<li>Gender: " + reqGender + "</li>" : "") +
                        "</ul>";

                if (!first) json.append(",");
                json.append("{")
                    .append("\"id\":").append(rs.getInt("scheme_id")).append(",")
                    .append("\"name\":\"").append(escape(schemeName)).append("\",")
                    .append("\"auth\":\"").append(authId == 1 ? "Central Govt" : "Tamil Nadu Govt").append("\",")
                    .append("\"authClass\":\"").append(authId == 1 ? "badge-central" : "badge-state").append("\",")
                    .append("\"benefit\":\"").append(escape(benefitDesc)).append("\",")
                    .append("\"desc\":\"").append(escape(rs.getString("simplified_description"))).append("\",")
                    .append("\"offDesc\":\"").append(escape(offDesc)).append("\",")
                    .append("\"tenure\":\"").append(tenure != null ? escape(tenure) : "Lifetime").append("\",")
                    .append("\"categories\":\"").append(escape(category_list)).append("\",")
                    .append("\"criteriaHtml\":\"").append(escape(criteriaList)).append("\",")
                    .append("\"eligible\":").append(is_eligible ? "true" : "false").append(",")

                    .append("\"reason\":\"").append(escape(reason)).append("\"")
                    .append("}");

                first = false;
            }
        } catch (Exception e) {}
        json.append("]");
        return json.toString();
    }

    
    private static String escape(String s) {
        if(s==null) return "";
        return s.replace("\"", "\\\"").replace("\n", " ").replace("\r", "");
    }
}
