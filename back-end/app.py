from flask import Flask, render_template, jsonify, request
import connection_pool

app = Flask(__name__, static_url_path='/')

@app.route('/', methods=["GET"])
def index():
    return render_template('index.html')

"""Gets the list of participantIds in the program logs database to display in the first dropdown of the PDA UI"""
@app.route('/participants', methods = ['GET'])
def get_participantIds():
    with connection_pool.get_conn_from_pool() as cursor:
        cursor.execute("SELECT DISTINCT participantid FROM program_logs ORDER BY participantid;")
        data = cursor.fetchall()
    return jsonify(data)

"""Gets the list of exercise numbers attempted by a given participantId to display in the second dropdown of the PDA UI"""
@app.route('/exercise_numbers', methods = ['GET'])
def get_exercise_numbers():
    with connection_pool.get_conn_from_pool() as cursor:
        cursor.execute('SELECT exercise_number FROM program_logs WHERE program_logs.participantId::text=%s ORDER BY exercise_number ASC;', 
        (request.args.get('participantId'), ))
        data = cursor.fetchall()
    return jsonify(data)

"""Gets the list of snapshots (program at a given point in time) for a specific participantId and exercise number."""
@app.route('/snapshots', methods = ['GET'])
def get_snapshots():
    with connection_pool.get_conn_from_pool() as cursor:
        cursor.execute('SELECT logs_snapshots, date, comments, id FROM program_logs WHERE participantId=%s AND exercise_number=%s;',
        (request.args.get('participantId'), request.args.get('exercise_number')))
        data = cursor.fetchall()
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True)