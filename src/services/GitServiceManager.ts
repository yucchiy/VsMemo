import { IGitService, GitChange } from './interfaces/IGitService';
import { VsCodeGitService } from './implementations/VsCodeGitService';
import { CommandLineGitService } from './implementations/CommandLineGitService';

export class GitServiceManager implements IGitService {
  private services: IGitService[];
  private availableService?: IGitService;

  constructor() {
    // Order matters: VS Code API first, then command line fallback
    this.services = [
      new VsCodeGitService(),
      new CommandLineGitService()
    ];
  }

  async isAvailable(): Promise<boolean> {
    await this.findAvailableService();
    return !!this.availableService;
  }

  async getChanges(): Promise<GitChange[]> {
    const service = await this.getService();
    return await service.getChanges();
  }

  async stage(files: string[]): Promise<void> {
    const service = await this.getService();
    await service.stage(files);
  }

  async commit(message: string): Promise<void> {
    const service = await this.getService();
    await service.commit(message);
  }

  async push(): Promise<void> {
    const service = await this.getService();
    await service.push();
  }

  getServiceName(): string {
    return this.availableService?.getServiceName() || 'No Git service available';
  }

  /**
   * Execute an operation with automatic fallback to alternative services
   */
  async executeWithFallback<T>(
    operation: (service: IGitService) => Promise<T>,
    operationName: string = 'Git operation'
  ): Promise<T> {
    const errors: Error[] = [];

    for (const service of this.services) {
      try {
        const isAvailable = await service.isAvailable();
        if (!isAvailable) {
          continue;
        }

        console.log(`Attempting ${operationName} with ${service.getServiceName()}`);
        const result = await operation(service);
        console.log(`${operationName} succeeded with ${service.getServiceName()}`);

        // Cache the working service for future operations
        this.availableService = service;
        return result;

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);
        console.warn(`${operationName} failed with ${service.getServiceName()}:`, err.message);
      }
    }

    // All services failed
    const errorMessage = `All Git services failed for ${operationName}:\n` +
      errors.map((err, i) => `${this.services[i].getServiceName()}: ${err.message}`).join('\n');

    throw new Error(errorMessage);
  }

  /**
   * Get the first available Git service
   */
  private async getService(): Promise<IGitService> {
    if (this.availableService) {
      // Check if cached service is still available
      try {
        const isStillAvailable = await this.availableService.isAvailable();
        if (isStillAvailable) {
          return this.availableService;
        }
      } catch (error) {
        console.warn('Cached Git service is no longer available:', error);
      }

      // Clear cache if service is no longer available
      this.availableService = undefined;
    }

    await this.findAvailableService();

    if (!this.availableService) {
      throw new Error('No Git service is available');
    }

    return this.availableService;
  }

  /**
   * Find and cache the first available Git service
   */
  private async findAvailableService(): Promise<void> {
    for (const service of this.services) {
      try {
        const isAvailable = await service.isAvailable();
        if (isAvailable) {
          this.availableService = service;
          console.log(`Using Git service: ${service.getServiceName()}`);
          return;
        }
      } catch (error) {
        console.warn(`Failed to check availability of ${service.getServiceName()}:`, error);
      }
    }

    this.availableService = undefined;
  }

  /**
   * Get information about all services and their availability
   */
  async getServiceStatus(): Promise<Array<{ name: string; available: boolean; error?: string }>> {
    const status = [];

    for (const service of this.services) {
      try {
        const available = await service.isAvailable();
        status.push({
          name: service.getServiceName(),
          available
        });
      } catch (error) {
        status.push({
          name: service.getServiceName(),
          available: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return status;
  }
}