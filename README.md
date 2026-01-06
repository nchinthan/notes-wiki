🧠 Hierarchical Note-taking & Knowledge System
A sophisticated web application for organizing information into hierarchical structures. This system distinguishes between Maps (containers/folders) and Pages (actual content), providing a deep-nesting capability for complex knowledge management.

🌟 Key Features
Hierarchical Organization: Organize notes using a nested "Map" and "Page" structure.
Unique Statistical Auth: An implicit login system using mean and standard deviation parameters for user verification.
Background Web Scraping: Integrated threading to run routine web updates/scrapes without blocking the main server.
Role-Based Access Control (RBAC): Distinct permissions for normal_access and high_level_access users, with a specific "Development Mode" for unrestricted editing.
Search & Discovery: Built-in search functionality and "Popular/Discover" algorithms for content navigation.
RESTful API: Fully documented endpoints for CRUD operations on maps, pages, and keywords.

🛠 Tech Stack
Backend: Python / Flask
Database Interface: Custom dataInterface (Map/Page objects)
Scraping: Selenium/Custom Browser Automation (via init_browser)
Concurrency: Python threading for background routines
Security: Flask Sessions with UUID-based authorized user tracking
