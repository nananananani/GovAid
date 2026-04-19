package service;

import util.DBConnection;
import java.sql.*;

public class EligibilityEngine {

    public static String getEligibleSchemesJSON(int citizenId) {
        StringBuilder json = new StringBuilder("[");
        String sql = "SELECT s.scheme_id, s.scheme_name, s.official_description, s.simplified_description, s.authority_id, s.tenure, " +
                     "b.benefit_type, b.benefit_amount, b.benefit_description, " +
                     "c.date_of_birth, c.annual_income, c.gender, c.occupation, c.state_of_residence, " +
                     "e.min_age, e.max_age, e.min_income, e.max_income, e.required_gender, e.required_occupation " +
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
                
                int minAge = rs.getInt("min_age");
                int maxAge = rs.getObject("max_age") != null ? rs.getInt("max_age") : 150;
                double minIncome = rs.getDouble("min_income");
                double maxIncome = rs.getObject("max_income") != null ? rs.getDouble("max_income") : Double.MAX_VALUE;
                String reqGender = rs.getString("required_gender");
                String reqOcc = rs.getString("required_occupation");

                boolean eligible = true;
                String reason = "Profile Matched";
                
                if (age < minAge || age > maxAge) eligible = false;
                if (income < minIncome || income > maxIncome) eligible = false;
                if (reqGender != null && !reqGender.equals("ANY") && !reqGender.equalsIgnoreCase(gender)) eligible = false;
                if (reqOcc != null && !reqOcc.isEmpty() && !reqOcc.equalsIgnoreCase(occupation)) eligible = false;
                if (authId == 2 && state != null && !state.toLowerCase().contains("tamil nadu")) eligible = false;
                
                if(eligible) {
                    if (reqOcc != null && !reqOcc.isEmpty()) reason = "Matches " + reqOcc + " Occupation";
                    else if (reqGender != null && !reqGender.equals("ANY")) reason = "Exclusive for " + reqGender;
                    else if (authId == 2) reason = "Matched State Region";
                    else reason = "Income & Age Profile Matched";
                    
                    // Criteria bullet points string builder
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
                        .append("\"criteriaHtml\":\"").append(escape(criteriaList)).append("\",")
                        .append("\"reason\":\"").append(escape(reason)).append("\",")
                        .append("\"type\":\"eligible\"")
                        .append("}");
                    first = false;
                }
            }
        } catch (Exception e) {}
        json.append("]");
        return json.toString();
    }
    
    public static String getAllSchemesJSON() {
        StringBuilder json = new StringBuilder("[");
        String sql = "SELECT s.scheme_id, s.scheme_name, s.official_description, s.simplified_description, s.authority_id, s.tenure, " +
                     "b.benefit_type, b.benefit_amount, b.benefit_description, " +
                     "e.min_age, e.max_age, e.min_income, e.max_income, e.required_gender " +
                     "FROM Scheme s " +
                     "LEFT JOIN Benefit b ON s.scheme_id = b.scheme_id " +
                     "LEFT JOIN EligibilityCriteria e ON s.scheme_id = e.scheme_id " +
                     "WHERE s.status = 'ACTIVE'";
                     
        Connection conn = DBConnection.getConnection();
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            ResultSet rs = pstmt.executeQuery();
            boolean first = true;
            while(rs.next()) {
                int authId = rs.getInt("authority_id");
                String schemeName = rs.getString("scheme_name");
                String benefitAmount = rs.getString("benefit_amount");
                String offDesc = rs.getString("official_description");
                String tenure = rs.getString("tenure");
                String benefitDesc = (benefitAmount != null && !benefitAmount.equals("0.00")) ? "₹ " + benefitAmount : rs.getString("benefit_description");
                
                int minAge = rs.getInt("min_age");
                int maxAge = rs.getObject("max_age") != null ? rs.getInt("max_age") : 150;
                double maxIncome = rs.getObject("max_income") != null ? rs.getDouble("max_income") : Double.MAX_VALUE;
                String reqGender = rs.getString("required_gender");
                
                String criteriaList = "<ul>" +
                        "<li>Age Target: " + minAge + " to " + (maxAge >= 150 ? "Any" : maxAge) + "</li>" +
                        "<li>Income Ceil: " + (maxIncome > 99999999 ? "No limit" : "₹" + maxIncome) + "</li>" +
                        (reqGender != null && !reqGender.equals("ANY") ? "<li>Demographic: " + reqGender + "</li>" : "") +
                        "</ul>";

                String tags = "[\"All\"";
                if(authId == 1) tags += ",\"Central\""; else tags += ",\"Tamil Nadu\"";
                String text = (schemeName + " " + rs.getString("simplified_description")).toLowerCase();
                if(text.contains("student") || text.contains("education") || text.contains("school")) tags += ",\"Student\"";
                if(text.contains("women") || text.contains("girl")) tags += ",\"Women\"";
                if(text.contains("farm") || text.contains("kisan") || text.contains("agri")) tags += ",\"Farmer\"";
                if(text.contains("health") || text.contains("maternity")) tags += ",\"Health\"";
                tags += "]";

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
                    .append("\"criteriaHtml\":\"").append(escape(criteriaList)).append("\",")
                    .append("\"tags\":").append(tags).append(",")
                    .append("\"type\":\"all\"")
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
