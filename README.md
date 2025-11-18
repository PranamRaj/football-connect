⚽ FootConnect – Football Community Platform

A community-driven platform connecting players, clubs, coaches, and football organisations across India.

<p align="center"> <img src="https://img.shields.io/badge/NodeJS-Backend-green?style=for-the-badge"> <img src="https://img.shields.io/badge/PostgreSQL-Database-blue?style=for-the-badge"> <img src="https://img.shields.io/badge/Docker-Containerization-2496ED?style=for-the-badge"> <img src="https://img.shields.io/badge/Express.js-Framework-black?style=for-the-badge"> </p>
📘 Overview

FootConnect is a full-stack football community platform designed to bring together players, clubs, coaches, and football organisations.
It enables players to register, find nearby clubs, showcase their skills, interact socially, and participate in matches — all in one place.

This project was created for a hackathon, demonstrating location-based features, community engagement, live news APIs, and talent discovery.

🚀 Features
🔐 User Registration & Profiles

Sign up with name, email, password, location, and position.

Players get personal profiles with:

Skill ratings (Dribbling, Passing, Shooting…)

Posts / Updates (like social media)

Points & achievements

Match performance history

🏟️ Nearby Clubs & Organisations

Clubs/associations can register and appear in the local clubs section.

Players can discover clubs near their city to join or attend matches.

📰 Live Football News & India FIFA Ranking

Powered by NewsAPI.

Shows:

Latest football news in India

ISL / I-League updates

FIFA Ranking for India

⭐ Skill Rating System

Hosts/referees rate players on:

Dribbling

Shooting

Passing

Teamwork

Fitness

Ratings influence leaderboard position and match selection.

🏆 Leaderboard

Ranks players based on:

Points

Skills

Recent performances

Helps clubs & scouts identify top talents.

🎮 Matches & Special Tournaments

Organisations can create matches.

Players can join or request participation.

Top-rated players may qualify for special matches where selectors pick players for regional/state teams.

📍 Regional Section

Highlights:

State-level tournaments

Region-wise rankings

Regional clubs & events

💬 Social Feed

Players can post:

Match moments

Skill videos

Highlights

Team announcements

This creates a mini social-network-like experience.

🛠️ Tech Stack
Frontend

EJS (templating)

Vanilla JavaScript

CSS (no frameworks)

Backend

Node.js

Express.js

Sessions + Authentication

Bcrypt (password hashing)

Database

PostgreSQL

pg (node-postgres)

External APIs

NewsAPI → Latest Indian football news

DevOps / Tools

Docker (Postgres + pgAdmin)

Nodemon

VS Code

🔧 Setup Instructions
1️⃣ Install dependencies
npm install

2️⃣ Start PostgreSQL and pgAdmin (Docker)
docker start postgres
docker start pgadmin

3️⃣ Run the server
npm start


Or with nodemon:

nodemon server.js

4️⃣ Open in browser
http://localhost:3000

🛡️ Security

Secure password hashing with bcrypt.

Protected sessions.

Input validation.

Database sanitization to prevent SQL injection.

🧩 Future Enhancements

Real-time chat using Socket.io.

Follow system (players follow players).

Club admin dashboard.

Map integration for nearby clubs.

Video uploads for skill highlights.

Push notifications for events/matches.

👥 Team
Role	Member
Backend Developer	Sardar Saqhib
Frontend UI	Preetham SS
Database & Docker	Pranam Raj
API Integrations    Pranam Kotyan
🏁 Final Summary

FootConnect is a complete football community ecosystem designed to strengthen the Indian football culture by connecting:

Players ↔ Clubs ↔ Coaches ↔ Scouts ↔ Organisations

With:

location-based club discovery

player skill ratings

match organisation

FIFA & news updates

social interaction

FootConnect helps players grow, collaborate, and get noticed.
