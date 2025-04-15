const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine and static folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// DB setup
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error(err.message);
  else console.log('Connected to DB');
});

db.run(`CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  day TEXT,
  start TEXT,
  end TEXT
)`);

const friends = ['Samuel', 'Sharon', 'Vibuthi', 'Vaishak', 'Anirudh', 'Gautam'];
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

app.get('/', (req, res) => {
    res.render("index", { overlaps: {} }); // or actual overlaps if available

});

app.post('/submit', (req, res) => {
  const { name } = req.body;
  const entries = [];

  for (const key in req.body) {
    if (key.startsWith('day_')) {
      const day = key.replace('day_', '');
      const [start, end] = req.body[key].split(' - ');
      entries.push([name, day, start, end]);
    }
  }

  db.serialize(() => {
    db.run(`DELETE FROM availability WHERE name = ?`, [name]);
    const stmt = db.prepare(`INSERT INTO availability (name, day, start, end) VALUES (?, ?, ?, ?)`);
    entries.forEach(e => stmt.run(e));
    stmt.finalize(() => {
      res.redirect('/results');
    });
  });
});

function findOverlap(slots) {
  const result = {};
  for (const day of days) {
    const intervals = slots[day];
    if (!intervals || intervals.length !== 6) continue;

    let latestStart = '00:00';
    let earliestEnd = '23:59';

    intervals.forEach(([start, end]) => {
      if (start > latestStart) latestStart = start;
      if (end < earliestEnd) earliestEnd = end;
    });

    if (latestStart < earliestEnd) {
      result[day] = [latestStart, earliestEnd];
    }
  }
  return result;
}

app.get('/results', (req, res) => {
  db.all(`SELECT * FROM availability`, (err, rows) => {
    const slotsByDay = {};
    for (const day of days) {
      slotsByDay[day] = [];
    }

    rows.forEach(row => {
      slotsByDay[row.day].push([row.start, row.end]);
    });

    const overlaps = findOverlap(slotsByDay);
    res.render('results', { overlaps });
  });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
