
import React, { useState } from 'react';
import { Container, Typography, Box, Button, TextField, Grid, Paper, Alert } from '@mui/material';

const MAX_URLS = 6;

function App() {
  const [inputs, setInputs] = useState([
    { url: '', validity: '', shortcode: '' },
  ]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (idx, field, value) => {
    const newInputs = [...inputs];
    newInputs[idx][field] = value;
    setInputs(newInputs);
  };

  const addInput = () => {
    if (inputs.length < MAX_URLS) {
      setInputs([...inputs, { url: '', validity: '', shortcode: '' }]);
    }
  };

  const removeInput = (idx) => {
    if (inputs.length > 1) {
      setInputs(inputs.filter((_, i) => i !== idx));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResults([]);
    setLoading(true);
    try {
      const promises = inputs.map(async (input) => {
        if (!input.url) throw new Error('URL is required');
        const body = {
          url: input.url,
        };
        if (input.validity) body.validity = parseInt(input.validity);
        if (input.shortcode) body.shortcode = input.shortcode;
        const res = await fetch('/shorturls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Error');
        }
        return await res.json();
      });
      const data = await Promise.all(promises);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>URL Shortener</Typography>
        <Typography variant="body1" gutterBottom>
          Enter up to 5 URLs to shorten. Optionally set validity (minutes) and a preferred shortcode.
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {inputs.map((input, idx) => (
              <React.Fragment key={idx}>
                <Grid item xs={12} md={5}>
                  <TextField
                    label="Long URL"
                    value={input.url}
                    onChange={e => handleInputChange(idx, 'url', e.target.value)}
                    required
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="Validity (min)"
                    type="number"
                    value={input.validity}
                    onChange={e => handleInputChange(idx, 'validity', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Shortcode (optional)"
                    value={input.shortcode}
                    onChange={e => handleInputChange(idx, 'shortcode', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center' }}>
                  {inputs.length > 1 && (
                    <Button color="error" onClick={() => removeInput(idx)} variant="outlined">Remove</Button>
                  )}
                </Grid>
              </React.Fragment>
            ))}
            <Grid item xs={12}>
              <Button onClick={addInput} disabled={inputs.length >= MAX_URLS} variant="outlined">Add URL</Button>
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" disabled={loading}>Shorten URLs</Button>
            </Grid>
          </Grid>
        </form>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {results.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Shortened URLs</Typography>
            {results.map((res, idx) => (
              <Paper key={idx} sx={{ p: 2, mt: 2 }}>
                <Typography>Short Link: <a href={res.shortLink} target="_blank" rel="noopener noreferrer">{res.shortLink}</a></Typography>
                <Typography>Expiry: {res.expiry}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default App;
