# Program Logs Viewer Tool
A tool used to view students' Python programming log data in an easily digestible format. Originally create for the analysis conducted in the study "An Investigation Into K-12 Students' Debugging Behaviour in Python" but can be used as a tool for analysis of any Python log data of the same format.

Developed using an Angular front-end and a Python Flask back-end serving a PostgreSQL database. Built using Docker.

## Installation

### Prerequisites:
Make sure you've installed the most recent versions of the following:
- [NodeJS](https://nodejs.org/en/download)
- [Python](https://www.python.org/downloads/)
- [Docker](https://www.docker.com/products/docker-desktop/)

### Running (with Docker)
1. Run Docker Desktop. Make sure it's running Linux containers rather than Windows containers (see [here](https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/quick-start-windows-10-linux) for troublshooting help).
2. Create a `.env` file in the repository root containing the PostgreSQL password:

   ```
   DB_PASSWORD=choose-a-local-password
   ```

3. Create the persistent database volume once: `docker volume create program-logs-data`
4. Build the web image and start the services: `docker compose up -d --build`
5. Visit [http://localhost:5000](http://localhost:5000) and the Program Logs Viewer should be running.

#### Updating the web app

The Docker image contains both the Angular frontend and the Flask backend. After changing either, rebuild and recreate the web service:

```
docker compose up -d --build --force-recreate program-logs-server
```

This does not reset or modify the PostgreSQL volume.

## Usage

https://github.com/LaurieGale10/program-logs-viewer/assets/60512477/718d0e85-e4f0-4b2d-997b-bceca16cfd6e

The Program Logs Viewer Tool displays the log data for a set of participants (in the case of the original study, lower secondary students) and their attempted exercises. To view the debugging exercises, visit [here](https://anonymous.4open.science/r/debugging-behaviour-study-website-anonymised/). Once a participant ID and exercise is selected, if the participant has ran their program at least once, the state of the code when first pressing run will appear. From there, you can move between runs and observe the changes made between them. To provide more information, temporal data, such as the time between the students' last run, is also displayed, as well as the diffs between a run and its previous run.

### Database initialization and data

PostgreSQL initializes a new, empty `program-logs-data` volume using the SQL files mounted in `docker-compose.yml` (currently `init_db.sql` and `snapshot_data.sql`). To initialize with a different dataset, update the data-file mount to a compatible SQL dump before starting PostgreSQL with an empty volume. Use only data you are authorized to store and distribute.

These initialization scripts run only when PostgreSQL's data directory is empty. Changing a mounted SQL file and restarting the containers does not update an existing database. For an existing database, back it up and apply the required schema migration or data import explicitly.

The `program-logs-data` volume persists across container rebuilds and restarts. **Removing it permanently deletes its database contents.** Only do this if you intentionally want to discard the database and initialize it again:

```
docker compose down
docker volume rm program-logs-data
docker volume create program-logs-data
docker compose up -d --build
```

### Development

For hot reloading, run PostgreSQL in Docker and run Flask and Angular locally:

1. Create a `.env` file containing the database password:

   ```
   DB_PASSWORD=choose-a-local-password
   ```

2. Install the local dependencies once:

   ```
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   npm install
   ```

3. Start the development workflow from the repository root:

   ```
   npm run dev
   ```

This starts PostgreSQL in Docker, Flask with debug reloading, and Angular with hot reloading in one terminal. Open [http://localhost:4200](http://localhost:4200). Angular proxies API requests to Flask.

The password in `.env` is used by Flask and when PostgreSQL is first initialized. Do not commit `.env`. Changing `.env` does not change the password stored in an existing PostgreSQL volume; update the PostgreSQL role password as well, or use a fresh volume only if it is safe to discard the existing data.

## Contributing
Pull requests or suggestions to improve this tool are most welcome! For local development with hot reloading, follow the Development instructions above. For changes tested through Docker, rebuild the web service as described under Updating the web app.

## Additional Info
For those interested in analysing programming log data, the format of this data is described below and collected using the Ada code editor's logging. When a student runs the code, the following entry is added to a JSON of logs:

```
{
    (optional) "error": {
        "error: string //The error message thrown by the program, only present in a log if "compiled" is false
    },
    "compiled": boolean, //Whether the program successfully ran or not. Will be false if the program contains syntax or runtime errors
    "snapshot": string, //The program at the time of running, expressed as a string
    "timestamp": int //The time the program was ran at
}
```

Every keystroke made inside the code editor was also logged but not used for analysis.

## License

This repository is licensed under the terms of the MIT license (see `LICENSE.md`).