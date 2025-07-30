// Demo data for testing without API calls
// This can be used to demonstrate the application without requiring an API key

export const demoResponse = {
    "strategy": "For this production workload requiring 2 inference endpoints and 1 training pipeline, I'm implementing a balanced MIG configuration that optimizes both isolation and resource utilization. The strategy creates 2x 1g.10gb instances specifically for lightweight inference tasks (ideal for 7B-13B parameter models), providing maximum isolation while ensuring low latency. Additionally, I'm allocating 1x 3g.40gb instance for the training pipeline, which provides sufficient memory and compute for fine-tuning operations with reasonable batch sizes. This configuration leaves 20GB of memory available for system overhead and potential scaling, while maintaining optimal price-performance ratio for production workloads.",
    
    "commands": "# Disable existing MIG configuration\nsudo nvidia-smi -mig 0\n\n# Enable MIG mode\nsudo nvidia-smi -mig 1\n\n# Create GPU instances with optimal profile distribution\nsudo nvidia-smi mig -cgi 1g.10gb,1g.10gb,3g.40gb -C\n\n# Verify the configuration\nsudo nvidia-smi mig -lgip\n\n# List compute instances\nsudo nvidia-smi mig -lcip",
    
    "resources": {
        "memory_total": "60GB",
        "compute_units": "6",
        "efficiency_score": "88%"
    },
    
    "warnings": [
        "Monitor memory usage during peak inference loads - consider upgrading to 2g.20gb instances if 10GB proves insufficient",
        "Training workload may benefit from larger batch sizes with the allocated 40GB memory",
        "Consider implementing proper monitoring and alerting for GPU utilization metrics"
    ]
};

// Function to simulate API delay for realistic demo
export function simulateApiCall() {
    return new Promise(resolve => {
        setTimeout(() => resolve(demoResponse), 2000);
    });
}
