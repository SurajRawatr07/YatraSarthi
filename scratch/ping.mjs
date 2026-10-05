const form = new FormData();
form.append('tripId', 'dummy');
form.append('text', 'IRCTC PNR 1234');
fetch('http://localhost:3000/api/ingest/upload', { method: 'POST', body: form })
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
