# CommitmentPool HTML Prototype

## Run it
1. Extract `commitmentpool-html.zip`.
2. Open `index.html` in a modern browser. The prototype uses vanilla HTML, CSS and JavaScript.
3. For best localStorage consistency, run a simple local server from this folder:
   - Python: `python -m http.server 8000`
   - Then visit `http://localhost:8000`

## Demo journey
Landing → Sign up or demo login → Dashboard → Connect demo wallet → Explore Challenges → Challenge Details → Join → My Challenges / My Stakes → Submit Evidence → simulate verification → Settlement → Rewards / Activity.

## Important limitations
- Authentication, wallet connection, stakes, evidence, and settlement are demo-only browser states.
- No backend, wallet provider, oracle, file upload endpoint, or blockchain transaction is connected.
- Never enter a real password, seed phrase, or private key.
- Challenge catalogue and numerical values are illustrative.
- Reset prototype data from Settings to replay the journey.
