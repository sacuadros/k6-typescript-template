/**
 * Defines the structure for environment configuration variables.
 */
export interface IEnvConfig {
  API_KEY: string; // The API key for authentication.
}

/**
 * A concrete implementation of the IEnvConfig interface, pulling values from environment variables.
 */
const envConfig: IEnvConfig = {
  API_KEY: __ENV.API_KEY,
};

export default envConfig;
