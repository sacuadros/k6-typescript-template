import { spawn } from "child_process";
import { readdirSync, statSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import inquirer from "inquirer";
import dotenv from "dotenv"; // Import dotenv
import { ITestGroup } from "./common/interfaces/ITestDefinitions";

dotenv.config(); // Load environment variables at the start of the script

const distPath: string = "./dist/services"; // Change to the new service path
const resultsPath: string = "./results"; // Define the results directory path
const [, , serviceNameArg, testNameArg]: string[] = process.argv; // Remove argument for API_KEY, it will be used from .env

// Ensure that the results directory exists
function ensureResultsDirectory(): void {
  if (!existsSync(resultsPath)) {
    mkdirSync(resultsPath);
    console.log("Results directory created");
  }
}

// Function to group tests by service
function getTestsGroupedByService(): ITestGroup[] {
  const services: string[] = readdirSync(distPath);
  let iTestGroup: ITestGroup[] = [];

  services.forEach((service) => {
    const servicePath = join(distPath, service);
    if (statSync(servicePath).isDirectory()) {
      const tests: string[] = readdirSync(servicePath)
        .filter((file) => file.endsWith(".js"))
        .map((test) => test.replace(".js", ""));
      if (tests.length > 0) {
        iTestGroup.push({ service, tests });
      }
    }
  });

  return iTestGroup;
}

// Function to ask the user which service and test to run
async function askForServiceAndTest(iTestGroup: ITestGroup[]): Promise<void> {
  const serviceAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "selectedService",
      message: "Which service would you like to test?",
      choices: iTestGroup.map((g) => g.service),
    },
  ]);

  const selectedService = iTestGroup.find(
    (g) => g.service === serviceAnswer.selectedService
  );

  if (selectedService) {
    const testAnswer = await inquirer.prompt([
      {
        type: "list",
        name: "selectedTest",
        message: "Which test would you like to run?",
        choices: selectedService.tests,
      },
    ]);

    executeTest(selectedService.service, testAnswer.selectedTest);
  }
}

// Function to execute a specific test
function executeTest(serviceName: string, testName: string): void {
  ensureResultsDirectory(); // Ensure that the results directory exists before running the test
  const testPath = `./dist/services/${serviceName}/${testName}.js`; // Update path
  console.log(`Running test: ${serviceName}/${testName}`);

  const k6Process = spawn("k6", ["run", testPath], {
    stdio: "inherit",
    env: { ...process.env }, // Pass all current environment variables to k6
  });

  k6Process.on("close", (code) => {
    console.log(`The k6 process has finished with code ${code}`);
  });
}

// Main function to control the flow
async function main(): Promise<void> {
  if (serviceNameArg && testNameArg) {
    ensureResultsDirectory(); // Also ensure here in case it is executed directly with arguments
    executeTest(serviceNameArg, testNameArg);
  } else {
    // Interactive mode if no arguments are passed
    const iTestGroup: ITestGroup[] = getTestsGroupedByService();
    if (iTestGroup.length > 0) {
      await askForServiceAndTest(iTestGroup);
    } else {
      console.log("No tests found.");
    }
  }
}

main().catch(console.error);
