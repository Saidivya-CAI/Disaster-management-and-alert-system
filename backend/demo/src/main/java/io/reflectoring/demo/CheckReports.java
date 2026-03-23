
package io.reflectoring.demo;

import java.sql.*;

public class CheckReports {
    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/disaster_management";
        String user = "root";
        String password = "Divyamani@2724";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("Connected to the database!");
            
            String query = "SELECT COUNT(*) FROM rescue_reports";
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(query)) {
                if (rs.next()) {
                    System.out.println("Total reports: " + rs.getInt(1));
                }
            }

            query = "SELECT * FROM rescue_reports";
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(query)) {
                while (rs.next()) {
                    System.out.println("Report ID: " + rs.getLong("id") + ", Task ID: " + rs.getLong("rescue_task_id") + ", Update: " + rs.getString("status_update"));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
