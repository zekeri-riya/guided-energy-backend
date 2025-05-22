# Majorgen Backend

Majorgen Backend is an MVC (Model-View-Controller) architecture-based backend system built with Express and Mongoose. It provides a REST API for managing and interfacing with your data model efficiently.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- Node.js (version 20.5.0 or higher recommended)
- npm or Yarn
- MongoDB
- Docker

## Installation

To set up the Majorgen Backend locally, follow these steps:

1. Clone the repository:
   git clone git@github.com:salistech/new-workergen-backend.git
   cd workergen-backend

2. Install the dependencies:
   yarn install

3. Configure the environment variables:
   Create a `.env` file in the root directory and set up the necessary environment variables (e.g., `DATABASE_URL`, `PORT`).

## Running the Application

You can run the application in development, production, or dockerized environments.

### Development

To run the application in development mode with hot reloading:
yarn dev

### Production

To start the application in production mode using PM2:
yarn start

### Docker

For Docker environments, you can use the following commands based on your needs:

- For production:
  yarn docker:prod

- For development:
  yarn docker:dev

- For running tests within a Docker container:
  yarn docker:test

## Testing

To run tests, use the following commands:

- Run all tests:
  yarn test

- Watch tests:
  yarn test:watch

- Generate and view coverage reports:
  yarn coverage

- Send coverage reports to Coveralls:
  yarn coverage:coveralls

## Linting and Formatting

Ensure code consistency with linting and formatting:

- Lint the codebase:
  yarn lint

- Automatically fix linting errors:
  yarn lint:fix

- Check for formatting issues:
  yarn prettier

- Automatically fix formatting issues:
  yarn prettier:fix

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Make your changes and commit (`git commit -am 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Create a new Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Thanks to all contributors who have helped to develop and maintain Majorgen Backend.
