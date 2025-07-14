# Oil Price Tracker

This is a full-stack web app for real-time gas and diesel price tracking and automated buying for truckers and truck stop owners.

## Full Feature List

- Real-time fuel price dashboard (React, Chart.js)
- Interactive charts and tables for price history
- Map view of fuel prices by region (Leaflet)
- Price alerts and notifications (email, dashboard)
- Automated order placement when price hits user target
- User authentication (JWT, bcrypt)
- Role-based access (Trucker, Truck Stop Owner)
- Stripe payment integration for secure transactions
- Backend API (FastAPI, Python)
- MongoDB database for users, alerts, orders
- Integration with EIA API for official fuel prices
- Pagination and filtering for large datasets
- Responsive, modern UI
- Secure environment variable management (.env)
- GitHub Copilot custom instructions

## Future Fixes & Improvements

- Add password reset and email verification
- Add user profile management and settings
- Enhance security (rate limiting, input validation)
- Add support for more payment providers
- Add admin dashboard for analytics and management
- Optimize backend queries and performance
- Add unit and integration tests (frontend & backend)
- Improve mobile experience and accessibility
- Add internationalization (i18n)
- Add Docker support for easy deployment

## Project Scope

- Designed for truckers and truck stop owners to track, alert, and automate fuel purchases
- Scalable architecture for future expansion (more products, regions)
- Modular codebase for easy maintenance and feature addition
- Open for contributions and feature requests


## Features

- Real-time fuel price dashboard (React)
- Price alerts and notifications
- Automated order placement when price hits target
- User authentication
- Stripe payment integration
- Backend API (Node.js/Express)
- MongoDB database
- Integration with EIA API for fuel prices

## Getting Started

1. Install dependencies: `npm install`
2. Start frontend: `npm run dev`
3. Backend setup: See `/server` folder (to be created)

## Project Structure

- `/src`: React frontend code
- `/server`: Node.js backend (to be added)
- `.github/copilot-instructions.md`: Copilot custom instructions

## Next Steps

- Build backend API for price fetching, alerts, and orders
- Connect frontend to backend
- Add authentication and payment features

---

For questions or contributions, open an issue or pull request.
