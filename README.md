
# k6 TypeScript Test Generator

This project streamlines the creation of performance tests using k6, enhanced by the power of TypeScript for a more efficient and safer development experience.

## Features

- **TypeScript for k6 Tests**: Leverage TypeScript to write your k6 tests, enabling type safety and code efficiency.
- **Esbuild Compilation**: Utilizes esbuild for quick compilation of TypeScript to JavaScript.
- **Preconfigured Project Structure**: Start quickly with a well-organized structure and predefined configurations.

## Installation

To set up the project locally, follow these steps:

```bash
git clone git@github.com:sacuadros/k6-typescript-template.git
cd k6-typescript-template
npm install
```

## Usage

### Test Development

Develop your tests in the `services/` directory using TypeScript. Before running any tests, compile your TypeScript files to JavaScript:

```bash
npm run build
```

### Running Tests

To run the tests, compile your TypeScript test scripts first. After compilation, you have two options:

1. **Dropdown for Test Selection**:

   Run the following command without arguments to get a dropdown list of available services and projects:

   ```bash
   npm run test
   ```

   Follow the console instructions to select the specific service and project for which you wish to run tests.

2. **Direct Test Execution**:

   If you know which test you want to run, specify the service and test script directly:

   ```bash
   npm run test <service> <script>
   ```

### Example

To run a specific test script from a service:

```bash
npm run test myService myTestScript.js
```

## Templates

For guidance on creating your tests, refer to the `templates` service, which contains template guides for various test scenarios.

## K6 Examples

[Ejemplos en la documentación oficial](https://k6.io/docs/examples/)

## Papa Parse CSV parser

[Documentación oficial](https://www.papaparse.com/docs)
