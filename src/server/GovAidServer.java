package server;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import dao.CitizenDAO;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.sql.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * GovAid Native Web Server.
 * Boots a standalone HTTP server without Spring Boot, perfect for JDBC college projects.
 */
public class GovAidServer {

    public static void main(String[] args) throws Exception {
        // Run on default port 8080
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        
        // Serve UI statically (Make sure working directory is GovAid_DBMS)
        server.createContext("/", new StaticFileHandler());
        
        // Configure Web APIs
        server.createContext("/api/signup", new SignupHandler());
        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/eligibility", new EligibilityHandler());
        server.createContext("/api/schemes", new SchemesHandler());
        server.createContext("/api/apply", new ApplyHandler());
        server.createContext("/api/profile", new ProfileHandler());
        
        server.setExecutor(null);
        server.start();
        System.out.println("\n[GovAid API] Server launched securely.");
        System.out.println("[GovAid API] Open locally at: http://localhost:8080/frontend/index.html\n");
    }

    /**
     * Handles dynamic Form parsing (application/x-www-form-urlencoded).
     */
    public static Map<String, String> parseFormData(InputStream is) throws IOException {
        InputStreamReader isr = new InputStreamReader(is, "utf-8");
        BufferedReader br = new BufferedReader(isr);
        String query = br.readLine();
        Map<String, String> map = new HashMap<>();
        
        if (query != null && !query.isEmpty()) {
            String[] pairs = query.split("&");
            for (String pair : pairs) {
                int idx = pair.indexOf("=");
                if(idx > 0 && pair.length() > idx + 1) {
                    map.put(URLDecoder.decode(pair.substring(0, idx), "UTF-8"), 
                            URLDecoder.decode(pair.substring(idx + 1), "UTF-8"));
                }
            }
        }
        return map;
    }

    /**
     * Standard Server logic for static HTML/CSS/JS viewing.
     */
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/")) {
                path = "/frontend/index.html";
            }
            
            // Adjusts root mapping to load from absolute or relative workspace paths
            File file = new File("." + path);
            if (file.exists()) {
                exchange.sendResponseHeaders(200, file.length());
                OutputStream os = exchange.getResponseBody();
                java.nio.file.Files.copy(file.toPath(), os);
                os.close();
            } else {
                String error = "404 File Not Found";
                exchange.sendResponseHeaders(404, error.length());
                OutputStream os = exchange.getResponseBody();
                os.write(error.getBytes());
                os.close();
            }
        }
    }

    /**
     * Integrates API with CitizenDAO to securely register Citizen.
     */
    static class SignupHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("POST".equals(exchange.getRequestMethod())) {
                Map<String, String> form = parseFormData(exchange.getRequestBody());
                
                CitizenDAO dao = new CitizenDAO();
                boolean success = false;
                
                try {
                    // Mapping URL Payload back to JDBC DAO params
                    String dobStr = form.get("dob");
                    Date birthDate = Date.valueOf(dobStr); 
                    double income = Double.parseDouble(form.getOrDefault("income", "0"));

                    success = dao.signupCitizen(
                        form.get("email"),
                        form.get("password"),
                        form.get("aadhaar"),
                        form.get("first_name"),
                        form.get("last_name"),
                        birthDate,
                        form.get("gender"),
                        income,
                        form.get("occupation"),
                        form.get("street"),
                        form.get("city"),
                        form.get("pincode"),
                        form.get("phone")
                    );
                    
                } catch (Exception e) {
                    System.err.println("Web JSON Parse Error: " + e.getMessage());
                }

                String response = success ? "{\"status\": \"success\"}" : "{\"status\": \"error\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, response.length());
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes());
                os.close();
            }
        }
    }

    /**
     * Login Authentication endpoint utilizing CitizenDAO optimized checks.
     */
    static class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("POST".equals(exchange.getRequestMethod())) {
                Map<String, String> form = parseFormData(exchange.getRequestBody());
                
                CitizenDAO dao = new CitizenDAO();
                int citizenId = dao.loginCitizen(form.get("email"), form.get("password"));
                
                String response = (citizenId > 0) ? "{\"status\": \"success\", \"citizen_id\": " + citizenId + "}" : "{\"status\": \"error\"}";
                
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, response.length());
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes());
                os.close();
            }
        }
    }

    /**
     * Endpoint resolving dynamic eligibility computations from EligibilityEngine.
     */
    static class EligibilityHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                String query = exchange.getRequestURI().getQuery();
                int citizenId = Integer.parseInt(query.split("=")[1]);
                String json = service.EligibilityEngine.getEligibleSchemesJSON(citizenId);
                
                byte[] bytes = json.getBytes("UTF-8");
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            } catch(Exception e) {}
        }
    }

    /**
     * Endpoint pulling completely mapped schemes directory.
     */
    static class SchemesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                String query = exchange.getRequestURI().getQuery();
                int citizenId = (query != null && query.contains("=")) ? Integer.parseInt(query.split("=")[1]) : 0;
                String json = service.EligibilityEngine.getAllSchemesJSON(citizenId);
                byte[] bytes = json.getBytes("UTF-8");
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            } catch(Exception e) {
                e.printStackTrace();
            }
        }

    }

    /**
     * Endpoint resolving application insertion
     */
    static class ApplyHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("POST".equals(exchange.getRequestMethod())) {
                Map<String, String> form = parseFormData(exchange.getRequestBody());
                int citizenId = Integer.parseInt(form.get("citizen_id"));
                int schemeId = Integer.parseInt(form.get("scheme_id"));
                
                dao.ApplicationDAO dao = new dao.ApplicationDAO();
                boolean success = dao.applyForScheme(citizenId, schemeId);
                
                String response = success ? "{\"status\": \"success\"}" : "{\"status\": \"error\"}";
                
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, response.getBytes().length);
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes());
                os.close();
            }
        }
    }

    /**
     * Endpoint pulling precise personal profile attributes to visualize dashboard state natively.
     */
    static class ProfileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                String query = exchange.getRequestURI().getQuery();
                if(query == null) return;
                int citizenId = Integer.parseInt(query.split("=")[1]);
                
                String json = "{}";
                String sql = "SELECT * FROM Citizen WHERE citizen_id = ?";
                String countSql = "SELECT COUNT(*) FROM CitizenSchemeSelection WHERE citizen_id = ?";
                             
                java.sql.Connection conn = util.DBConnection.getConnection();
                if(conn != null) {
                    int appliedCount = 0;
                    try(java.sql.PreparedStatement ps = conn.prepareStatement(countSql)) {
                        ps.setInt(1, citizenId);
                        java.sql.ResultSet rs = ps.executeQuery();
                        if(rs.next()) appliedCount = rs.getInt(1);
                    }

                    try(java.sql.PreparedStatement ps = conn.prepareStatement(sql)) {
                        ps.setInt(1, citizenId);
                        java.sql.ResultSet rs = ps.executeQuery();
                        if(rs.next()) {
                            json = String.format("{\"first_name\":\"%s\", \"last_name\":\"%s\", \"email\":\"%s\", \"aadhaar_number\":\"%s\", \"date_of_birth\":\"%s\", \"gender\":\"%s\", \"occupation\":\"%s\", \"annual_income\":%.2f, \"state_of_residence\":\"%s\", \"city\":\"%s\", \"applied_count\":%d}",
                                rs.getString("first_name"), rs.getString("last_name"), rs.getString("email"), 
                                rs.getString("aadhaar_number"), rs.getDate("date_of_birth").toString(), rs.getString("gender"),
                                rs.getString("occupation"), rs.getDouble("annual_income"),
                                rs.getString("state_of_residence"), rs.getString("city") == null ? "" : rs.getString("city"), appliedCount);
                        }
                    }
                }
                
                byte[] bytes = json.getBytes("UTF-8");
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            } catch(Exception e) {
                e.printStackTrace();
            }
        }

    }
}
