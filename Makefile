.PHONY: setup setup-backend setup-frontend dev-backend dev-frontend test test-backend test-frontend lint

setup: setup-backend setup-frontend

setup-backend:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt

setup-frontend:
	cd frontend && npm install

# Run each in its own terminal
dev-backend:
	cd backend && .venv/bin/uvicorn app:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

test: test-backend test-frontend

test-backend:
	cd backend && .venv/bin/pytest -q

test-frontend:
	cd frontend && npm test

lint:
	cd backend && .venv/bin/ruff check .
