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
2. Run `docker volume create program-logs-data`
3. Run `docker compose up -d`
4. Visit [http://localhost:500](http://localhost:500) and the Program Logs Viewer should be running.

## Usage

https://github.com/LaurieGale10/program-logs-viewer/assets/60512477/718d0e85-e4f0-4b2d-997b-bceca16cfd6e

The Program Logs Viewer Tool displays the log data for a set of participants (in the case of the original study, lower secondary students) and their attempted exercises. To view the debugging exercises, visit [here](https://github.com/LaurieGale10/debugging-behaviour-study-website). Once a participant ID and exercise is selected, if the participant has ran their program at least once, the state of the code when first pressing run will appear. From there, you can move between runs and observe the changes made between them. To provide more information, temporal data, such as the time between the students' last run, is also displayed, as well as the diffs between a run and its previous run.

### Sample Data
As we do not have permission to publish the log data of the student's who took part in the original study, we instead provide some sample student data to showcase the tool. By default, this will be loaded into the tool when running `docker compose up -d`. If you have your own log data, simply replace the call to sample_data.sql with a pg_dumps .sql file of your log data.

## Contributing
Pull requests or suggestions to improve this tool are most welcome! If you'd like to develop some contributions, fork the repo and run `app.py` and whenever you need to rebuild the Angular project, run `ng build --base-href /static/` and copy .js and .css files over to /static and index.html to /templates. This autmotically rebuilds the angular project every 10 seconds, saving you having to manually rebuild every time you make a change.

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