# Program Logs Viewer Tool
A tool used to view students' Python programming log data in an easily digestible format. Originally create for the analysis conducted in the study "Investigating the Debugging Behaviour of Lower Secondary Students" but can be used as a tool for analysis of any Python log data of the same format.

Developed using an Angular front-end and a Python Flask back-end serving a PostgreSQL database.

## Installation

### Prerequisites:
- Make sure you've installed [NodeJS](https://nodejs.org/en) and the most recent version of [Python](https://www.python.org/downloads/)

### Installing
1. Run `npm install` in the root of the directory.
2. Create a [virtual environment](https://realpython.com/python-virtual-environments-a-primer/) and run `pip install -r requirements.txt` in the root of the directory.
3. Establish database connection details

To run the project, run `python app.py` in the root directory.

### Requirements
- List npm modules?
- All Python libraries used are located in requirements.txt

## Usage
Include video of project at work
The Program Logs Viewer Tool displays the log data for a set of participants (in the case of the original study, lower secondary students) and their attempted exercises. To view the debugging exercises, visit [here](https://github.com/LaurieGale10/debugging-behaviour-study-website). Once a participant and exercise is selected, if the participant has ran their program at least once, the state of their code at the first run will appear. From there, you can move between runs and observe the changes they make between each run. To provide more information, temporal data, such as the time between the students' last run, is also displayed. You can also view the diffs between a run and its previous run.

### Sample Data
As we do not have permission to publish the log data of the student's who took part in the original study, we instead provide some sample student data to showcase the tool.

## Contributing
Pull requests or suggestions to improve this tool are most welcome! If you'd like to develop some contributions, fork the repo and run `front-end/src/build_dev.py` in parallel with `app.py`. This autmotically rebuilds the angular project every 10 seconds, saving you having to manually rebuild every time you make a change.

## Authors

## License

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