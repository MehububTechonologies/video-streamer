# Media Streamer

A robust and scalable media streaming server built with Node.js, Express, and Docker. This application is designed to efficiently serve video files, PDFs, and host playable HTML5 games, all containerized for easy deployment and management. It uses Nginx as a reverse proxy for optimized performance and includes JWT-based authentication for securing routes.

## Features

- **Video Streaming:** Streams MP4 video files with support for `range` requests, allowing for efficient seeking and playback.
- **PDF Serving:** Serves PDF documents that can be viewed directly in the browser.
- **HTML5 Game Hosting:** Hosts and serves directories containing HTML5 games, making them playable directly from the server.
- **Dockerized Environment:** Fully containerized with Docker and Docker Compose for consistent and isolated deployments.
- **Nginx Reverse Proxy:** Utilizes Nginx for high-performance request handling and optimized streaming.
- **JWT Authentication:** Includes middleware for JWT-based authentication to protect specific routes.
- **Structured Routing:** A clear and organized routing system for different media types.

## Directory Structure

```
/
├── media/                # Root directory for all media content
│   ├── videos/           # Contains video files organized by activity/category
│   ├── pdfs/             # Contains PDF files
│   └── games/            # Contains HTML5 game directories
├── src/                  # Source code for the Node.js application
│   ├── controllers/      # Logic for handling requests
│   ├── middleware/       # Custom middleware (e.g., authentication)
│   └── routes/           # Express route definitions
├── nginx/                # Nginx configuration
│   └── default.conf
├── .env.example          # Example environment file
├── app.js                # Main application entry point
├── package.json          # Project dependencies and scripts
├── Dockerfile            # Dockerfile for the Node.js app
└── docker-compose.yml    # Docker Compose configuration
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd video-streamer
    ```

2.  **Create the environment file:**
    Create a `.env` file in the project root by copying the example:
    ```bash
    cp .env.example .env
    ```
    Update the `.env` file with your specific configurations:
    ```env
    # --- Application Settings ---
    PORT=8080
    MEDIA_DIR=/data/media
    CORS_ALLOWED_ORIGINS=http://localhost:3000,http://yourotherdomain.com

    # --- Docker Host Settings ---
    # Port to expose on the host machine
    DOCKER_HOST_PORT=8080
    # Absolute path on your host machine where media files are stored
    MEDIA_HOST_PATH=/path/to/your/media

    # --- Security ---
    # A strong, secret key for signing JWTs
    JWT_SECRET=your_super_secret_key
    ```
    **Important:** Replace `/path/to/your/media` with the absolute path to the `media` directory on your local machine.

3.  **Build and run the containers:**
    ```bash
    docker-compose up --build
    ```
    The server will be accessible at `http://localhost:80`.

## API Endpoints

### Videos

-   `GET /videos/:activity`: Lists all categories for a given activity.
-   `GET /videos/:activity/:category`: Lists all `.mp4` files in a specific category.
-   `GET /videos/:activity/:category/:filename`: Streams a specific video file.

### PDFs

-   `GET /pdfs`: Lists all available PDF files.
-   `GET /pdfs/:filename`: Serves a specific PDF file.

### Games

-   `GET /games`: Lists all available HTML5 games.
-   `GET /games/:gameName/*`: Serves the files for a specific game.

## Authentication

This application uses JSON Web Tokens (JWT) for authentication. The `auth.js` middleware can be applied to any route to protect it. To enable authentication on a route, uncomment the `verifyToken` middleware in the corresponding route file (e.g., `src/routes/pdfRoutes.js`).
