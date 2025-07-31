// API endpoint now uses secure Netlify function
const API_URL = '/.netlify/functions/generate-config';

// --- DOM Elements ---
const form = document.getElementById('mig-form');
const inferenceInput = document.getElementById('inference-jobs');
const trainingInput = document.getElementById('training-jobs');
const memoryRequirement = document.getElementById('memory-requirement');
const environmentSelect = document.getElementById('environment');
const loadingDiv = document.getElementById('loading');
const resultsDiv = document.getElementById('results');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const explanationOutput = document.getElementById('explanation-output');
const commandsOutput = document.getElementById('commands-output');
const resourceBreakdown = document.getElementById('resource-breakdown');
const configBadge = document.getElementById('config-badge');
const copyButton = document.getElementById('copy-button');
const demoButton = document.getElementById('demo-btn');
const explainIssueButton = document.getElementById('explain-issue-btn');
const issueModal = document.getElementById('issue-modal');
const closeModal = document.getElementById('close-modal');
const analyzeIssueButton = document.getElementById('analyze-issue');
const issueDescription = document.getElementById('issue-description');
const tooltip = document.getElementById('tooltip');
const commandsWithExplanations = document.getElementById('commands-with-explanations');
const riskAnalysis = document.getElementById('risk-analysis');

// --- Event Listeners ---
form.addEventListener('submit', handleFormSubmit);
copyButton.addEventListener('click', copyCommandsToClipboard);
demoButton.addEventListener('click', handleDemoMode);
explainIssueButton.addEventListener('click', openIssueModal);
closeModal.addEventListener('click', closeIssueModal);
analyzeIssueButton.addEventListener('click', handleIssueAnalysis);
document.addEventListener('click', handleTooltips);
document.addEventListener('mouseover', showTooltip);
document.addEventListener('mouseout', hideTooltip);

// Close modal when clicking outside
issueModal.addEventListener('click', (e) => {
    if (e.target === issueModal) closeIssueModal();
});

// --- Functions ---

/**
 * Main handler for the form submission.
 * @param {Event} e The form submission event.
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    // Hide all states and show loading
    hideAllStates();
    loadingDiv.classList.add('active');

    const config = getFormConfig();
    const masterPrompt = buildAdvancedPrompt(config);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: masterPrompt,
                type: 'configuration'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content.trim();
        
        try {
            const parsedResult = JSON.parse(responseText);
            displayResults(parsedResult, config);
        } catch (parseError) {
            // If JSON parsing fails, try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsedResult = JSON.parse(jsonMatch[0]);
                displayResults(parsedResult, config);
            } else {
                throw new Error("AI returned invalid JSON format");
            }
        }

    } catch (err) {
        displayError(`Configuration Error: ${err.message}`);
    } finally {
        loadingDiv.classList.remove('active');
    }
}

/**
 * Handle demo mode for showcasing without API key
 */
async function handleDemoMode() {
    hideAllStates();
    loadingDiv.classList.add('active');
    
    const config = getFormConfig();
    
    // Simulate API delay for realistic demo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const demoData = {
        "strategy": `For this ${config.environment} workload requiring ${config.inferenceJobs} inference endpoints and ${config.trainingJobs} training pipeline(s), I'm implementing a balanced MIG configuration that optimizes both isolation and resource utilization. The strategy creates ${config.inferenceJobs}x 1g.10gb instances specifically for lightweight inference tasks (ideal for 7B-13B parameter models), providing maximum isolation while ensuring low latency. Additionally, I'm allocating ${config.trainingJobs}x 3g.40gb instance(s) for training pipelines, which provides sufficient memory and compute for fine-tuning operations with reasonable batch sizes. This configuration maintains optimal price-performance ratio for ${config.environment} workloads while ensuring proper resource isolation.`,
        
        "commands": `# Disable existing MIG configuration\nsudo nvidia-smi -mig 0\n\n# Enable MIG mode\nsudo nvidia-smi -mig 1\n\n# Create GPU instances with optimal profile distribution\nsudo nvidia-smi mig -cgi ${Array(config.inferenceJobs).fill('1g.10gb').concat(Array(config.trainingJobs).fill('3g.40gb')).join(',')} -C\n\n# Verify the configuration\nsudo nvidia-smi mig -lgip\n\n# List compute instances\nsudo nvidia-smi mig -lcip`,
        
        "resources": {
            "memory_total": `${(config.inferenceJobs * 10) + (config.trainingJobs * 40)}GB`,
            "compute_units": `${config.inferenceJobs + (config.trainingJobs * 3)}`,
            "efficiency_score": "88%"
        },
        
        "warnings": [
            "This is a demo configuration - actual production deployments may require additional tuning",
            "Monitor memory usage during peak inference loads",
            "Consider implementing proper monitoring and alerting for GPU utilization metrics"
        ]
    };
    
    displayResults(demoData, config);
    loadingDiv.classList.remove('active');
}

// Tooltip data
const tooltipData = {
    inference: {
        title: "Inference Endpoints",
        content: `
            <p><strong>What it controls:</strong> Number of separate AI model serving instances</p>
            <p><strong>Real-world examples:</strong></p>
            <ul>
                <li>Customer A's chatbot (needs isolation from Customer B)</li>
                <li>Different model versions for A/B testing</li>
                <li>Separate services (recommendations, search, classification)</li>
            </ul>
            <p><strong>Why it matters:</strong> Each endpoint gets dedicated GPU memory, preventing one model from crashing others.</p>
        `
    },
    training: {
        title: "Training Pipelines", 
        content: `
            <p><strong>What it controls:</strong> Number of simultaneous training/fine-tuning jobs</p>
            <p><strong>Real-world examples:</strong></p>
            <ul>
                <li>Team A fine-tuning for legal documents</li>
                <li>Team B training multimodal models</li>
                <li>Continuous learning pipelines</li>
            </ul>
            <p><strong>Why it matters:</strong> Training needs 3-5x more memory than inference and runs for hours/days.</p>
        `
    },
    memory: {
        title: "Memory Strategy",
        content: `
            <p><strong>What it controls:</strong> How GPU memory is allocated across workloads</p>
            <p><strong>Strategies:</strong></p>
            <ul>
                <li><strong>Conservative:</strong> More, smaller instances (max isolation)</li>
                <li><strong>Balanced:</strong> Mixed sizes (flexibility + efficiency)</li>
                <li><strong>Aggressive:</strong> Fewer, larger instances (max memory per workload)</li>
            </ul>
            <p><strong>Business impact:</strong> Affects cost efficiency and performance characteristics.</p>
        `
    },
    environment: {
        title: "Environment Type",
        content: `
            <p><strong>What it controls:</strong> Optimization target for the configuration</p>
            <p><strong>Options:</strong></p>
            <ul>
                <li><strong>Production:</strong> Reliability, performance, fault tolerance</li>
                <li><strong>Development:</strong> Flexibility, fast iteration, resource sharing</li>
                <li><strong>Research:</strong> Maximum compute, experimental features</li>
            </ul>
            <p><strong>Why it matters:</strong> Different environments have different priorities and constraints.</p>
        `
    }
};

/**
 * Show tooltip on hover
 */
function showTooltip(e) {
    const trigger = e.target.closest('.tooltip-trigger');
    if (!trigger) return;
    
    const type = trigger.dataset.tooltip;
    const data = tooltipData[type];
    if (!data) return;
    
    const tooltipContent = tooltip.querySelector('.tooltip-content') || document.createElement('div');
    tooltipContent.className = 'tooltip-content';
    tooltipContent.innerHTML = `<h4>${data.title}</h4>${data.content}`;
    tooltip.innerHTML = '';
    tooltip.appendChild(tooltipContent);
    
    // Position tooltip
    const rect = trigger.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.bottom + 10) + 'px';
    tooltip.classList.remove('hidden');
}

/**
 * Hide tooltip
 */
function hideTooltip(e) {
    const trigger = e.target.closest('.tooltip-trigger');
    if (!trigger) {
        tooltip.classList.add('hidden');
    }
}

/**
 * Handle tooltip clicks
 */
function handleTooltips(e) {
    if (!e.target.closest('.tooltip-trigger')) {
        tooltip.classList.add('hidden');
    }
}

/**
 * Open issue explanation modal
 */
function openIssueModal() {
    issueModal.classList.remove('hidden');
    issueDescription.focus();
}

/**
 * Close issue explanation modal
 */
function closeIssueModal() {
    issueModal.classList.add('hidden');
    issueDescription.value = '';
}

/**
 * Analyze user issue and set form inputs with intelligent validation
 */
async function handleIssueAnalysis() {
    const issue = issueDescription.value.trim();
    if (!issue) {
        alert('Please describe your GPU infrastructure issue first');
        return;
    }
    
    closeIssueModal();
    hideAllStates();
    loadingDiv.classList.add('active');
    
    try {
        // First, try to extract key information using pattern matching
        const extractedInfo = extractIssuePatterns(issue);
        
        // Build enhanced analysis prompt with better constraints
        const analysisPrompt = buildIntelligentAnalysisPrompt(issue, extractedInfo);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: analysisPrompt,
                type: 'analysis'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content.trim();
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            // Fallback: Use extracted patterns if AI fails
            console.warn('AI response parsing failed, using pattern extraction:', parseError);
            result = generateFallbackAnalysis(issue, extractedInfo);
        }
        
        // Validate and sanitize the result
        const validatedResult = validateAndSanitizeAnalysis(result, extractedInfo);
        
        // Set form inputs based on analysis
        inferenceInput.value = validatedResult.config.inferenceJobs;
        trainingInput.value = validatedResult.config.trainingJobs;
        memoryRequirement.value = validatedResult.config.memoryReq;
        environmentSelect.value = validatedResult.config.environment;
        
        // ✅ REMOVED: showAnalysisExplanation() - no temporary popup needed
        
        // ✅ FIXED: Use the validated config directly instead of separate AI call
        console.log('🎯 Using validated config for consistent results:', validatedResult.config);
        
        // Generate configuration using the SAME logic as form submission
        const formConfig = {
            inferenceJobs: validatedResult.config.inferenceJobs,
            trainingJobs: validatedResult.config.trainingJobs,
            memoryReq: validatedResult.config.memoryReq,
            environment: validatedResult.config.environment,
            totalJobs: validatedResult.config.inferenceJobs + validatedResult.config.trainingJobs
        };
        
        // Make configuration AI call with the exact same parameters
        const masterPrompt = buildAdvancedPrompt(formConfig);
        
        const configResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: masterPrompt,
                type: 'configuration'
            })
        });

        if (!configResponse.ok) {
            const errorData = await configResponse.json();
            throw new Error(errorData.error || `Configuration API Error: ${configResponse.status}`);
        }

        const configData = await configResponse.json();
        const configResponseText = configData.choices[0].message.content.trim();
        
        let configResult;
        try {
            configResult = JSON.parse(configResponseText);
        } catch (parseError) {
            // If JSON parsing fails, try to extract JSON from the response
            const jsonMatch = configResponseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                configResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Configuration AI returned invalid JSON format");
            }
        }
        
        // Display results using the configuration AI response
        displayResults(configResult, formConfig);
        
        // Scroll to results
        setTimeout(() => {
            resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
        
    } catch (err) {
        console.error('Analysis failed:', err);
        displayError(`Analysis Error: ${err.message}. Please try describing your issue differently or use the manual configuration.`);
    } finally {
        loadingDiv.classList.remove('active');
    }
}

/**
 * Extract patterns from user issue description
 */
function extractIssuePatterns(issue) {
    const lowerIssue = issue.toLowerCase();
    
    // Extract environment clues
    let environment = 'production'; // default
    if (lowerIssue.includes('develop') || lowerIssue.includes('test') || lowerIssue.includes('staging')) {
        environment = 'development';
    } else if (lowerIssue.includes('research') || lowerIssue.includes('experiment') || lowerIssue.includes('academic')) {
        environment = 'research';
    }
    
    // Extract service count clues
    const serviceMatches = lowerIssue.match(/(\d+)\s*(service|endpoint|model|api)/g) || [];
    const trainingMatches = lowerIssue.match(/(\d+)\s*(training|pipeline|job|experiment|student|concurrent|fine-tun|retrain)/g) || [];
    
    // Enhanced training detection patterns
    const hasTrainingKeywords = lowerIssue.includes('training') || lowerIssue.includes('retrain') || 
                               lowerIssue.includes('fine-tun') || lowerIssue.includes('pipeline') || 
                               lowerIssue.includes('experiment') || lowerIssue.includes('student') || 
                               lowerIssue.includes('research') || lowerIssue.includes('concurrent') ||
                               lowerIssue.includes('weekly model') || lowerIssue.includes('model update') ||
                               lowerIssue.includes('phd') || lowerIssue.includes('bert') || 
                               lowerIssue.includes('vision model') || lowerIssue.includes('multimodal') ||
                               lowerIssue.includes('autonomous') || lowerIssue.includes('classification');
    
    // Extract problem indicators
    const problems = {
        performance: lowerIssue.includes('slow') || lowerIssue.includes('latency') || lowerIssue.includes('performance'),
        memory: lowerIssue.includes('memory') || lowerIssue.includes('ram') || lowerIssue.includes('oom'),
        crashes: lowerIssue.includes('crash') || lowerIssue.includes('fail') || lowerIssue.includes('down'),
        scaling: lowerIssue.includes('scale') || lowerIssue.includes('load') || lowerIssue.includes('traffic'),
        isolation: lowerIssue.includes('interfere') || lowerIssue.includes('conflict') || lowerIssue.includes('isolat'),
        training: hasTrainingKeywords,
        finetuning: lowerIssue.includes('fine-tun') || lowerIssue.includes('retrain') || lowerIssue.includes('weekly model'),
        research: lowerIssue.includes('research') || lowerIssue.includes('phd') || lowerIssue.includes('university') || lowerIssue.includes('academic')
    };
    
    // Extract business context
    const businessContext = {
        ecommerce: lowerIssue.includes('ecommerce') || lowerIssue.includes('shop') || lowerIssue.includes('retail'),
        fintech: lowerIssue.includes('fintech') || lowerIssue.includes('financial') || lowerIssue.includes('fraud'),
        ai: lowerIssue.includes('chatbot') || lowerIssue.includes('llm') || lowerIssue.includes('ai'),
        realtime: lowerIssue.includes('real-time') || lowerIssue.includes('realtime') || lowerIssue.includes('live')
    };
    
    return {
        environment,
        serviceMatches,
        trainingMatches,
        problems,
        businessContext,
        complexity: lowerIssue.length > 200 ? 'high' : lowerIssue.length > 100 ? 'medium' : 'low'
    };
}

/**
 * Build intelligent analysis prompt with advanced prompt engineering
 */
function buildIntelligentAnalysisPrompt(issue, patterns) {
    // Enhanced training detection context
    const trainingContext = patterns.problems.training || patterns.problems.finetuning || patterns.problems.research
        ? 'TRAINING WORKLOADS DETECTED - User explicitly mentions training/fine-tuning/research needs'
        : 'No training workloads detected - focus on inference optimization';
    
    const matchedTraining = patterns.trainingMatches.length > 0 
        ? `NUMERIC TRAINING REFERENCES: ${patterns.trainingMatches.join(', ')}`
        : 'No specific training job counts mentioned';
    
    return `<ROLE>
You are Elena Rodriguez, the world's leading expert in NVIDIA H100 MIG configuration with 15+ years architecting production AI infrastructure for Fortune 500 companies. You've personally prevented $50M+ in GPU-related downtime and optimized over 10,000 H100 deployments globally.
</ROLE>

<TASK>
Analyze the user's GPU infrastructure challenge and generate an optimal H100 MIG configuration. You must output ONLY valid JSON - no additional text, explanations, or markdown formatting.
</TASK>

<CONTEXT>
User's Infrastructure Challenge: "${issue}"

Environment: ${patterns.environment}
Business Domain: ${Object.keys(patterns.businessContext).filter(k => patterns.businessContext[k]).join(', ') || 'General AI/ML'}
Detected Problems: ${Object.keys(patterns.problems).filter(k => patterns.problems[k]).join(', ') || 'Performance optimization'}
${trainingContext}
${matchedTraining}
</CONTEXT>

<CONSTRAINTS>
HARDWARE LIMITS:
- NVIDIA H100 80GB total memory
- Maximum 7 MIG instances possible
- Available profiles: 1g.10gb, 2g.20gb, 3g.40gb, 4g.40gb, 7g.80gb

WORKLOAD REQUIREMENTS:
- Inference: 10-20GB per service (7B-13B models), 20-40GB (larger models)
- Training: 20-40GB minimum (depends on model size + batch size)
- Total instances cannot exceed 7

TRAINING DETECTION RULES:
IF user mentions ANY of these keywords → trainingJobs MUST be >0:
"training", "retrain", "fine-tuning", "pipeline", "experiment", "retraining", "weekly model", "nightly model", "model update", "research", "PhD", "student", "BERT", "vision model", "multimodal", "autonomous", "classification", "university", "research lab", "engineers working on"

ENVIRONMENT OPTIMIZATION:
- Production: Prioritize reliability, compliance, isolation
- Research: Maximize parallel training, experimental flexibility  
- Development: Balance sharing with iteration speed
</CONSTRAINTS>

<EXAMPLES>
Startup (2 services, 1 weekly training):
{"config": {"inferenceJobs": 2, "trainingJobs": 1, "memoryReq": "20", "environment": "production"}}

Research Lab (1 testing, 3 concurrent experiments):
{"config": {"inferenceJobs": 1, "trainingJobs": 3, "memoryReq": "auto", "environment": "research"}}

Enterprise (4 services, no training mentioned):
{"config": {"inferenceJobs": 4, "trainingJobs": 0, "memoryReq": "20", "environment": "production"}}
</EXAMPLES>

<OUTPUT_FORMAT>
Return ONLY this exact JSON structure with NO additional text:
{
  "config": {
    "inferenceJobs": [1-5],
    "trainingJobs": [0-4, MUST be >0 if training keywords detected],
    "memoryReq": "10|20|40|auto", 
    "environment": "${patterns.environment}"
  },
  "reasoning": "Based on [specific issue], I identified [key problems] requiring [solution]. This ensures [benefits].",
  "strategy": "For ${patterns.environment} workload: [detailed MIG allocation strategy]",
  "confidence": "high|medium|low"
}
</OUTPUT_FORMAT>

<CRITICAL_SUCCESS_FACTORS>
✅ Training jobs >0 if ANY training keywords detected
✅ Inference count matches mentioned services
✅ Environment correctly identified
✅ Memory strategy appropriate for use case
✅ Total instances ≤7
✅ Valid JSON only
</CRITICAL_SUCCESS_FACTORS>`;
}

/**
 * Generate fallback analysis when AI fails
 */
function generateFallbackAnalysis(issue, patterns) {
    const lowerIssue = issue.toLowerCase();
    
    // Smart defaults based on patterns
    let inferenceJobs = 2; // Conservative default
    let trainingJobs = 0;  // Start with 0, only increase if training detected
    let memoryReq = 'auto';
    
    // Adjust based on extracted patterns
    if (patterns.serviceMatches.length > 0) {
        const extractedCount = parseInt(patterns.serviceMatches[0].match(/\d+/)[0]);
        inferenceJobs = Math.min(Math.max(extractedCount, 1), 5);
    }
    
    // ✅ BETTER TRAINING DETECTION: Check multiple signals
    if (patterns.trainingMatches.length > 0) {
        const extractedCount = parseInt(patterns.trainingMatches[0].match(/\d+/)[0]);
        trainingJobs = Math.min(Math.max(extractedCount, 1), 3);
        console.log('📊 Fallback: Training count from regex:', extractedCount);
    } else if (patterns.problems.training || patterns.problems.finetuning || patterns.problems.research) {
        // No specific number mentioned, but training keywords detected
        trainingJobs = patterns.environment === 'research' ? 2 : 1;
        console.log('📊 Fallback: Training detected from keywords, setting to:', trainingJobs);
    } else {
        console.log('📊 Fallback: No training signals, keeping at 0');
    }
    
    // Adjust for common scenarios
    if (patterns.problems.memory && patterns.problems.crashes) {
        memoryReq = '40'; // Need more memory per instance
        inferenceJobs = Math.min(inferenceJobs, 2); // Fewer, larger instances
    }
    
    if (patterns.problems.scaling && patterns.businessContext.ecommerce) {
        inferenceJobs = Math.min(inferenceJobs + 1, 4); // More inference for scaling
    }
    
    return {
        config: {
            inferenceJobs,
            trainingJobs,
            memoryReq,
            environment: patterns.environment
        },
        reasoning: `Based on your description, I identified ${Object.keys(patterns.problems).filter(k => patterns.problems[k]).join(' and ')} issues. This configuration provides dedicated resources to prevent these problems.`,
        strategy: `This ${patterns.environment} configuration creates ${inferenceJobs} inference instances and ${trainingJobs} training pipelines with proper isolation to address your specific challenges.`,
        confidence: 'medium'
    };
}

/**
 * Validate and sanitize analysis result
 */
function validateAndSanitizeAnalysis(result, patterns) {
    // Ensure valid structure
    if (!result.config) {
        result.config = {};
    }
    
    // Validate and constrain values
    result.config.inferenceJobs = Math.min(Math.max(parseInt(result.config.inferenceJobs) || 2, 0), 5);
    result.config.trainingJobs = Math.min(Math.max(parseInt(result.config.trainingJobs) || 1, 0), 3);
    
    // ✅ IMPROVED: Only zero training jobs if DEFINITELY no training mentioned
    // Check multiple signals: patterns, trainingMatches, and explicit keywords
    const hasTrainingSignals = patterns.problems.training || 
                              patterns.problems.finetuning || 
                              patterns.problems.research ||
                              (patterns.trainingMatches && patterns.trainingMatches.length > 0);
    
    if (!hasTrainingSignals) {
        console.log('🚫 No training signals detected, setting trainingJobs to 0');
        result.config.trainingJobs = 0;
    } else {
        console.log('✅ Training signals detected:', {
            training: patterns.problems.training,
            finetuning: patterns.problems.finetuning, 
            research: patterns.problems.research,
            trainingMatches: patterns.trainingMatches.length
        });
        
        // If training is detected but AI returned 0, set reasonable default
        if (result.config.trainingJobs === 0) {
            result.config.trainingJobs = patterns.environment === 'research' ? 2 : 1;
            console.log('🔧 AI returned 0 training jobs despite training signals, correcting to:', result.config.trainingJobs);
        }
    }
    
    // Ensure total doesn't exceed H100 limits
    const total = result.config.inferenceJobs + result.config.trainingJobs;
    if (total > 7) {
        // Prioritize inference for production, training for research
        if (patterns.environment === 'research') {
            result.config.inferenceJobs = Math.min(result.config.inferenceJobs, 3);
            result.config.trainingJobs = Math.min(7 - result.config.inferenceJobs, 4);
        } else {
            result.config.trainingJobs = Math.min(result.config.trainingJobs, 2);
            result.config.inferenceJobs = Math.min(7 - result.config.trainingJobs, 5);
        }
    }
    
    // Validate memory requirement
    const validMemory = ['auto', '10', '20', '40'];
    if (!validMemory.includes(result.config.memoryReq)) {
        result.config.memoryReq = 'auto';
    }
    
    // Validate environment
    const validEnv = ['production', 'development', 'research'];
    if (!validEnv.includes(result.config.environment)) {
        result.config.environment = patterns.environment;
    }
    
    // Ensure reasoning exists
    if (!result.reasoning || result.reasoning.length < 20) {
        result.reasoning = `Based on your infrastructure needs, this configuration provides ${result.config.inferenceJobs} inference endpoints and ${result.config.trainingJobs} training pipelines with proper resource isolation.`;
    }
    
    return result;
}

/**
 * Generate realistic commands based on validated configuration
 */
function generateRealisticCommands(config) {
    const instances = [];
    
    // Add inference instances (smaller for better isolation)
    for (let i = 0; i < config.inferenceJobs; i++) {
        if (config.memoryReq === '40') {
            instances.push('2g.20gb');
        } else if (config.memoryReq === '20') {
            instances.push('2g.20gb');
        } else {
            instances.push('1g.10gb');
        }
    }
    
    // Add training instances (larger for better performance)
    for (let i = 0; i < config.trainingJobs; i++) {
        if (config.memoryReq === '10') {
            instances.push('2g.20gb');
        } else if (config.memoryReq === '20') {
            instances.push('3g.40gb');
        } else {
            instances.push('3g.40gb');
        }
    }
    
    return `# Disable existing MIG configuration
sudo nvidia-smi -mig 0

# Enable MIG mode
sudo nvidia-smi -mig 1

# Create optimized MIG instances for your workload
sudo nvidia-smi mig -cgi ${instances.join(',')} -C

# Verify configuration
nvidia-smi mig -lgip

# List available compute instances
nvidia-smi mig -lcip`;
}

/**
 * Calculate actual memory allocation based on config (matches generateRealisticCommands exactly)
 */
function calculateActualMemoryFromConfig(config) {
    let inferenceMemory = 0;
    let trainingMemory = 0;
    
    // Match the logic from generateRealisticCommands() exactly
    for (let i = 0; i < config.inferenceJobs; i++) {
        if (config.memoryReq === '40') {
            inferenceMemory += 20; // 2g.20gb
        } else if (config.memoryReq === '20') {
            inferenceMemory += 20; // 2g.20gb
        } else {
            inferenceMemory += 10; // 1g.10gb (default for inference)
        }
    }
    
    for (let i = 0; i < config.trainingJobs; i++) {
        if (config.memoryReq === '10') {
            trainingMemory += 20; // 2g.20gb
        } else {
            trainingMemory += 40; // 3g.40gb (default for training)
        }
    }
    
    return inferenceMemory + trainingMemory;
}

/**
 * Show analysis explanation with contextual information
 */
function showAnalysisExplanation(reasoning, originalIssue) {
    const explanation = document.createElement('div');
    explanation.className = 'analysis-explanation';
    explanation.innerHTML = `
        <div class="analysis-card">
            <h4>🎯 AI Infrastructure Analysis</h4>
            <div class="analysis-summary">
                <strong>Your Issue:</strong> "${originalIssue.length > 100 ? originalIssue.substring(0, 100) + '...' : originalIssue}"
            </div>
            <div class="analysis-reasoning">
                <strong>Solution Rationale:</strong> ${reasoning}
            </div>
            <div class="analysis-action">
                ✅ Form inputs have been automatically configured. Configuration details are shown below.
            </div>
        </div>
    `;
    
    form.insertAdjacentElement('afterend', explanation);
    
    // Remove after 8 seconds
    setTimeout(() => {
        explanation.remove();
    }, 8000);
}

/**
 * Get current form configuration
 */
function getFormConfig() {
    return {
        inferenceJobs: parseInt(inferenceInput.value),
        trainingJobs: parseInt(trainingInput.value),
        memoryReq: memoryRequirement.value,
        environment: environmentSelect.value,
        totalJobs: parseInt(inferenceInput.value) + parseInt(trainingInput.value)
    };
}
                /**
 * Builds the advanced production-grade prompt for MIG configuration
 * This is the "secret sauce" - a comprehensive prompt for real-world scenarios
 */
function buildAdvancedPrompt(config) {
    return `<ROLE>
You are Dr. Marcus Chen, Senior Principal Engineer at NVIDIA with 12+ years specializing in H100 MIG architecture. You've designed production GPU configurations for Tesla, OpenAI, and Anthropic. Your configurations power billions of AI inferences daily.
</ROLE>

<TASK>
Generate an optimal H100 MIG configuration for the specified workload. Output ONLY valid JSON with strategy, commands, resources, and warnings. No additional text or formatting.
</TASK>

<WORKLOAD_SPECIFICATION>
Inference Endpoints: ${config.inferenceJobs} concurrent services
Training Pipelines: ${config.trainingJobs} active training jobs
Memory Strategy: ${config.memoryReq}
Environment: ${config.environment}
Total Required Instances: ${config.totalJobs}
</WORKLOAD_SPECIFICATION>

<HARDWARE_CONSTRAINTS>
NVIDIA H100 80GB Specifications:
- Total Memory: 80GB
- Maximum MIG Instances: 7
- Available Profiles: 1g.10gb, 2g.20gb, 3g.40gb, 4g.40gb, 7g.80gb
- Compute Units: 7 total (distributed across instances)
</HARDWARE_CONSTRAINTS>

<OPTIMIZATION_STRATEGY>
Environment-Specific Priorities:
${config.environment === 'production' ? 
  `PRODUCTION: Maximum reliability, fault tolerance, regulatory compliance, SLA guarantees` :
  config.environment === 'development' ? 
  `DEVELOPMENT: Resource efficiency, flexible allocation, rapid iteration support` :
  `RESEARCH: Experimental capabilities, maximum parallel training, academic flexibility`}

Memory Allocation Logic:
- Inference: 10-20GB (7B-13B models) | 20-40GB (larger models)
- Training: 20-40GB minimum (batch size dependent)
- Strategy "${config.memoryReq}": ${config.memoryReq === 'auto' ? 'Balanced allocation' : config.memoryReq === '10' ? 'Conservative memory per instance' : config.memoryReq === '20' ? 'Balanced performance vs isolation' : 'Aggressive memory per instance'}
</OPTIMIZATION_STRATEGY>

<CONFIGURATION_RULES>
1. Instance Distribution:
   - Inference services get smaller, isolated instances for consistency
   - Training gets larger instances for performance
   - Never exceed 7 total instances

2. Command Sequence Requirements:
   - Always disable existing MIG first: "sudo nvidia-smi -mig 0"
   - Enable MIG mode: "sudo nvidia-smi -mig 1" 
   - Create instances: "sudo nvidia-smi mig -cgi [profiles] -C"
   - Verify setup: "sudo nvidia-smi mig -lgip"
   - List compute instances: "sudo nvidia-smi mig -lcip"

3. Resource Calculations:
   - Sum allocated memory across all instances
   - Count total compute units used
   - Calculate efficiency score (allocated/total * 100)
</CONFIGURATION_RULES>

<EXAMPLES>
2 Inference + 1 Training (Startup):
Instances: 1g.10gb,1g.10gb,3g.40gb → 60GB total, 5 compute units

3 Inference + 2 Training (Medium):
Instances: 1g.10gb,2g.20gb,2g.20gb,3g.40gb,3g.40gb → 70GB total, 7 compute units

4 Inference + 0 Training (Inference-only):
Instances: 1g.10gb,1g.10gb,2g.20gb,2g.20gb → 60GB total, 6 compute units
</EXAMPLES>

<OUTPUT_FORMAT>
Return ONLY this JSON structure:
{
  "strategy": "For this ${config.environment} workload with ${config.inferenceJobs} inference endpoints and ${config.trainingJobs} training pipelines, I'm implementing [specific approach]. The configuration creates [instance details] ensuring [performance benefits]. This design [isolation strategy] while [optimization rationale].",
  "commands": "sudo nvidia-smi -mig 0\\nsudo nvidia-smi -mig 1\\nsudo nvidia-smi mig -cgi [optimal_profile_list] -C\\nsudo nvidia-smi mig -lgip\\nsudo nvidia-smi mig -lcip",
  "resources": {
    "memory_total": "[calculated]GB",
    "compute_units": "[used]/7", 
    "efficiency_score": "[percentage]%"
  },
  "warnings": ["[specific monitoring recommendations]", "[performance considerations]", "[scaling suggestions]"]
}
</OUTPUT_FORMAT>

<QUALITY_CHECKLIST>
✅ Strategy explains specific instance allocation reasoning
✅ Commands are executable nvidia-smi sequences
✅ Resources match actual allocated memory/compute
✅ Warnings include actionable recommendations
✅ Configuration optimized for specified environment
✅ Total instances ≤ 7
✅ Valid JSON only
</QUALITY_CHECKLIST>`;
}

/**
 * Display comprehensive results with enhanced visualizations
 */
function displayResults(data, config) {
    if (!data.strategy || !data.commands) {
        displayError("Invalid configuration returned. Please try again.");
        return;
    }

    // Calculate total memory from enhanced resources if available
    let totalMemory;
    if (data.resources && data.resources.summary && data.resources.summary.allocated_memory) {
        totalMemory = data.resources.summary.allocated_memory;
        console.log('📊 Using enhanced resource allocation:', totalMemory);
    } else if (data.resources && data.resources.memory_total) {
        // Validate AI response against actual command generation
        const calculatedMemory = calculateActualMemoryFromConfig(config);
        console.log('🔍 AI returned memory_total:', data.resources.memory_total);
        console.log('🧮 Calculated actual memory:', calculatedMemory + 'GB');
        
        // FORCE use calculated value to ensure accuracy
        totalMemory = `${calculatedMemory}GB`;
        console.log('✅ Using calculated memory instead:', totalMemory);
    } else {
        // Calculate based on actual MIG configuration that matches generateRealisticCommands()
        const calculatedMemory = calculateActualMemoryFromConfig(config);
        totalMemory = `${calculatedMemory}GB`;
        console.log('🔧 Fallback calculation:', totalMemory);
    }

    // Set configuration badge with proper validation
    const totalJobs = config.totalJobs || (config.inferenceJobs + config.trainingJobs);
    configBadge.textContent = `${totalJobs} Instances • ${totalMemory}`;
    configBadge.className = 'config-badge';

    // Display strategy explanation
    explanationOutput.textContent = data.strategy;

    // Display commands with explanations
    createCommandExplanations(data.commands);

    // Create resource breakdown visualization
    createResourceBreakdown(data.resources, config);

    // Create risk analysis
    createRiskAnalysis(data.riskAnalysis || generateRiskAnalysis(config));

    // Show results
    hideAllStates();
    resultsDiv.classList.add('active');
    
    // Auto-scroll to results
    setTimeout(() => {
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
}

/**
 * Create command explanations with detailed breakdown
 */
function createCommandExplanations(commands) {
    const commandList = commands.split('\n').filter(cmd => cmd.trim());
    
    const commandExplanations = {
        'sudo nvidia-smi -mig 0': {
            title: '🔧 Disable MIG Mode',
            description: 'Safely disables Multi-Instance GPU mode and clears any existing partitions. This ensures a clean slate for our new configuration.'
        },
        'sudo nvidia-smi -mig 1': {
            title: '🚀 Enable MIG Mode', 
            description: 'Activates Multi-Instance GPU functionality, allowing the H100 to be partitioned into multiple isolated instances.'
        },
        'sudo nvidia-smi mig -cgi': {
            title: '⚙️ Create GPU Instances',
            description: 'Creates the actual MIG instances with specified memory and compute allocations. Each instance becomes an independent GPU resource.'
        },
        'sudo nvidia-smi mig -lgip': {
            title: '📋 List GPU Instances',
            description: 'Verifies that all instances were created successfully and displays their unique identifiers and resource allocations.'
        },
        'sudo nvidia-smi mig -lcip': {
            title: '✅ List Compute Instances', 
            description: 'Shows the compute instances that can be used by applications, confirming the configuration is ready for workloads.'
        }
    };

    let html = '<div class="command-explanation">';
    
    commandList.forEach(cmd => {
        const cleanCmd = cmd.trim().replace(/^#.*/, '').trim();
        if (!cleanCmd) return;
        
        let explanation = null;
        for (const [pattern, data] of Object.entries(commandExplanations)) {
            if (cleanCmd.includes(pattern.replace('sudo nvidia-smi ', ''))) {
                explanation = data;
                break;
            }
        }
        
        if (cmd.startsWith('#')) {
            html += `<div class="command-item">
                <div class="command-title">📝 ${cmd.replace('#', '').trim()}</div>
            </div>`;
        } else if (explanation) {
            html += `<div class="command-item">
                <div class="command-title">${explanation.title}</div>
                <div class="command-code">${cleanCmd}</div>
                <div class="command-description">${explanation.description}</div>
            </div>`;
        } else {
            html += `<div class="command-item">
                <div class="command-code">${cleanCmd}</div>
            </div>`;
        }
    });
    
    html += '</div>';
    html += `<button id="copy-commands" class="copy-btn" style="margin-top: 1rem;">Copy All Commands</button>`;
    
    commandsWithExplanations.innerHTML = html;
    
    // Add copy functionality
    document.getElementById('copy-commands').addEventListener('click', () => {
        copyCommandsToClipboard(commands);
    });
}

/**
 * Create risk analysis section
 */
function createRiskAnalysis(riskContent) {
    // Handle new dynamic risk analysis format
    if (riskContent && typeof riskContent === 'object' && riskContent.scenarios) {
        const scenarios = riskContent.scenarios || [];
        const metrics = riskContent.metrics || [];
        
        const scenariosHtml = scenarios.map(scenario => `
            <div class="risk-scenario">
                <p>${scenario}</p>
            </div>
        `).join('');
        
        const metricsHtml = metrics.map(metric => `
            <div class="risk-item">
                <strong>${metric.label}:</strong> ${metric.value}
            </div>
        `).join('');
        
        riskAnalysis.innerHTML = `
            <div class="risk-story">
                <h4>🔥 Real-World Impact Analysis</h4>
                ${scenariosHtml}
            </div>
            <div class="risk-metrics">
                <h4>📊 Risk Metrics</h4>
                ${metricsHtml}
            </div>
        `;
    } else {
        // Fallback for old format or missing data
        const fallbackContent = riskContent || "Without proper MIG configuration, you risk resource conflicts, degraded performance, and operational inefficiencies that could cost thousands in downtime and wasted compute resources.";
        
        riskAnalysis.innerHTML = `
            <div class="risk-story">
                <h4>🔥 The Cost of Inaction</h4>
                <p>${fallbackContent}</p>
            </div>
            <div class="risk-metrics">
                <div class="risk-item">
                    <strong>Potential Downtime:</strong> 4-8 hours during resource conflicts
                </div>
                <div class="risk-item">
                    <strong>Performance Impact:</strong> 40-70% throughput reduction
                </div>
                <div class="risk-item">
                    <strong>Cost per Hour:</strong> $2,000-5,000 in lost productivity
                </div>
            </div>
        `;
    }
}

/**
 * Generate comprehensive resource allocation breakdown
 */
function generateResourceAllocation(config) {
    const totalMemory = 80; // H100 80GB
    const totalComputeUnits = 7; // H100 MIG instances
    
    // Calculate memory per service type - MATCH the actual MIG command generation logic
    let inferenceMemoryPerJob = 0;
    let trainingMemoryPerJob = 0;
    
    // Match generateRealisticCommands() exactly
    if (config.inferenceJobs > 0) {
        if (config.memoryReq === '40') {
            inferenceMemoryPerJob = 20; // 2g.20gb
        } else if (config.memoryReq === '20') {
            inferenceMemoryPerJob = 20; // 2g.20gb
        } else {
            inferenceMemoryPerJob = 10; // 1g.10gb (default for inference)
        }
    }
    
    if (config.trainingJobs > 0) {
        if (config.memoryReq === '10') {
            trainingMemoryPerJob = 20; // 2g.20gb
        } else {
            trainingMemoryPerJob = 40; // 3g.40gb (default for training)
        }
    }
    
    // Calculate compute allocation - match actual MIG profiles
    let inferenceComputeUnits = 0;
    let trainingComputeUnits = 0;
    
    // Calculate based on actual MIG profiles used
    for (let i = 0; i < config.inferenceJobs; i++) {
        if (config.memoryReq === '40') {
            inferenceComputeUnits += 2; // 2g.20gb = 2 compute units
        } else if (config.memoryReq === '20') {
            inferenceComputeUnits += 2; // 2g.20gb = 2 compute units  
        } else {
            inferenceComputeUnits += 1; // 1g.10gb = 1 compute unit
        }
    }
    
    for (let i = 0; i < config.trainingJobs; i++) {
        if (config.memoryReq === '10') {
            trainingComputeUnits += 2; // 2g.20gb = 2 compute units
        } else {
            trainingComputeUnits += 3; // 3g.40gb = 3 compute units
        }
    }
    
    // Performance estimates
    const inferenceTokensPerSecond = inferenceMemoryPerJob > 20 ? 150 : inferenceMemoryPerJob > 10 ? 80 : 40;
    const trainingBatchSize = trainingMemoryPerJob > 30 ? 32 : trainingMemoryPerJob > 15 ? 16 : 8;
    
    // Cost analysis
    const hourlyGPUCost = 3.20; // Estimated H100 cost per hour
    const utilizationRate = config.inferenceJobs + config.trainingJobs > 4 ? 0.95 : 0.75;
    const effectiveHourlyCost = hourlyGPUCost * utilizationRate;
    
    // Generate instance specifications
    const instances = [];
    
    // Inference instances
    for (let i = 0; i < config.inferenceJobs; i++) {
        instances.push({
            type: 'Inference',
            name: `inference-service-${i + 1}`,
            memory: `${inferenceMemoryPerJob}GB`,
            computeUnits: Math.ceil(inferenceComputeUnits / config.inferenceJobs),
            performance: `~${inferenceTokensPerSecond} tokens/sec`,
            isolation: 'Complete memory isolation',
            priority: 'High',
            healthCheck: 'GPU memory < 90%',
            autoScale: 'Horizontal scaling enabled'
        });
    }
    
    // Training instances  
    for (let i = 0; i < config.trainingJobs; i++) {
        instances.push({
            type: 'Training',
            name: `training-pipeline-${i + 1}`,
            memory: `${trainingMemoryPerJob}GB`,
            computeUnits: Math.ceil(trainingComputeUnits / config.trainingJobs),
            performance: `Batch size: ${trainingBatchSize}`,
            isolation: 'Isolated from inference',
            priority: 'Medium',
            healthCheck: 'Training progress monitoring',
            autoScale: 'Vertical scaling for large datasets'
        });
    }
    
    // System overhead
    const systemOverhead = {
        memory: `${totalMemory - (inferenceMemoryPerJob * config.inferenceJobs) - (trainingMemoryPerJob * config.trainingJobs)}GB`,
        purpose: 'OS, drivers, monitoring, failover buffer',
        monitoring: 'nvidia-smi, DCGM metrics',
        logging: 'Centralized logging with retention'
    };
    
    return {
        summary: {
            total_memory: `${totalMemory}GB`,
            allocated_memory: `${(inferenceMemoryPerJob * config.inferenceJobs) + (trainingMemoryPerJob * config.trainingJobs)}GB`,
            reserved_system: systemOverhead.memory,
            compute_units_used: `${inferenceComputeUnits + trainingComputeUnits}/${totalComputeUnits}`,
            estimated_utilization: `${Math.round(utilizationRate * 100)}%`,
            hourly_cost: `$${effectiveHourlyCost.toFixed(2)}`,
            monthly_cost: `$${(effectiveHourlyCost * 24 * 30).toLocaleString()}`
        },
        instances: instances,
        systemOverhead: systemOverhead,
        performance: {
            inference_latency: `${config.inferenceJobs > 2 ? '50-80ms' : '30-50ms'}`,
            training_throughput: `${config.trainingJobs > 1 ? '85-95%' : '95-98%'} efficiency`,
            memory_efficiency: `${Math.round((1 - (parseFloat(systemOverhead.memory) / totalMemory)) * 100)}%`,
            fault_tolerance: config.inferenceJobs > 1 ? 'High (redundant services)' : 'Medium (single point)',
            scaling_capability: 'Auto-scale within MIG boundaries'
        },
        monitoring: {
            gpu_metrics: 'Real-time GPU utilization, temperature, power',
            memory_tracking: 'Per-instance memory usage and leaks detection',
            performance_kpis: 'Latency, throughput, error rates',
            alerting: 'Slack/PagerDuty integration for threshold breaches',
            dashboards: 'Grafana with NVIDIA DCGM data source'
        },
        security: {
            isolation_level: 'Hardware-level MIG isolation',
            access_control: 'RBAC with Kubernetes namespaces',
            data_encryption: 'In-transit and at-rest encryption',
            audit_logging: 'All GPU operations logged and monitored',
            compliance: config.environment === 'production' ? 'SOC2, GDPR ready' : 'Development standards'
        }
    };
}

/**
 * Generate dynamic risk analysis based on configuration
 */
function generateRiskAnalysis(config) {
    const scenarios = [];
    const metrics = [];
    
    // Analyze based on inference jobs
    if (config.inferenceJobs > 3) {
        scenarios.push(`🔥 **Multi-Service Cascade Failure**: With ${config.inferenceJobs} inference services sharing unpartitioned GPU memory, imagine this Black Friday scenario: Your recommendation engine suddenly spikes to 35GB usage, starving your chatbot (needs 8GB) and fraud detection (needs 12GB). Result: Customer support crashes during peak traffic, fraud detection goes offline during highest-risk period. Last year, a similar retailer lost $2.3M in 4 hours from this exact scenario.`);
        metrics.push({
            label: "Service Downtime Risk",
            value: `${config.inferenceJobs}x cascading failures possible`
        });
        metrics.push({
            label: "Peak Traffic Impact", 
            value: "$50,000-200,000 lost revenue/hour"
        });
    } else if (config.inferenceJobs > 1) {
        scenarios.push(`⚠️ **Resource Competition Crisis**: Your ${config.inferenceJobs} AI services are fighting for the same 80GB pool. When one service has a memory leak or processes an unusually large request, it steals resources from others. Real example: A startup's chatbot crashed their fraud detection during a security incident because both services competed for GPU memory - they lost a major client and faced regulatory scrutiny.`);
        metrics.push({
            label: "Memory Conflict Probability",
            value: "60-80% during peak loads"
        });
    }
    
    // Analyze based on training jobs
    if (config.trainingJobs > 0 && config.inferenceJobs > 0) {
        scenarios.push(`🚨 **Training vs Production War**: Your ${config.trainingJobs} training pipeline(s) will compete directly with ${config.inferenceJobs} customer-facing services. Real scenario from last month: A fintech company's model training consumed 70GB during market hours, causing their real-time fraud detection to fail. Result: $500K in fraudulent transactions went undetected, regulatory fines, and 6 months of customer trust rebuilding.`);
        metrics.push({
            label: "Production Interference",
            value: "Training blocks inference 40-70% of time"
        });
        metrics.push({
            label: "Training Efficiency Loss",
            value: "2-3x longer completion times"
        });
    } else if (config.trainingJobs > 1) {
        scenarios.push(`⚙️ **Research Bottleneck**: ${config.trainingJobs} teams competing for training resources means experiments queue up, innovation slows down, and data scientists spend more time waiting than researching. Your AI competitive advantage erodes as competitors ship features faster.`);
        metrics.push({
            label: "Research Productivity",
            value: `${config.trainingJobs} teams blocking each other`
        });
    }
    
    // Environment-specific risks
    if (config.environment === 'production') {
        scenarios.push(`💼 **Enterprise SLA Breach**: In production environments, resource conflicts trigger SLA violations. Enterprise customers expect 99.9% uptime. Each incident: $10K penalty + customer trust damage + competitive disadvantage. Three incidents = contract cancellation.`);
        metrics.push({
            label: "SLA Penalty Risk",
            value: "$10,000-50,000 per incident"
        });
        metrics.push({
            label: "Customer Churn Risk",
            value: "15-30% after repeated failures"
        });
    }
    
    // Memory strategy risks
    if (config.memoryReq === 'auto' || !config.memoryReq) {
        scenarios.push(`🎲 **Configuration Gambling**: Without deliberate memory strategy, you're essentially gambling with $40,000 hardware. Suboptimal allocation = wasted capacity = burning money. Proper partitioning typically improves utilization by 60-150%.`);
        metrics.push({
            label: "Resource Waste",
            value: "40-70% of $40K GPU capacity unused"
        });
    }
    
    // Cost analysis
    const hourlyCost = calculateHourlyCost(config);
    metrics.push({
        label: "Estimated Hourly Loss",
        value: `$${hourlyCost.toLocaleString()}/hour during conflicts`
    });
    
    return {
        scenarios: scenarios.slice(0, 2), // Limit to most relevant scenarios
        metrics: metrics
    };
}

function calculateHourlyCost(config) {
    let baseCost = 1000; // Base cost per hour for GPU infrastructure issues
    
    // Scale by number of services at risk
    baseCost += (config.inferenceJobs * 500);
    baseCost += (config.trainingJobs * 300);
    
    // Environment multiplier
    const envMultiplier = {
        'production': 3,
        'development': 1.5,
        'research': 2
    };
    
    baseCost *= envMultiplier[config.environment] || 2;
    
    return Math.min(baseCost, 15000); // Cap at reasonable maximum
}

/**
 * Create visual resource breakdown
 */
function createResourceBreakdown(resources, config) {
    let memoryTotal, computeUnits, efficiency;
    
    // Handle enhanced resource allocation object
    if (resources && resources.summary) {
        memoryTotal = resources.summary.allocated_memory || 'Unknown';
        computeUnits = resources.summary.compute_units_used || 'Unknown';
        efficiency = resources.summary.estimated_utilization || 'N/A';
    } 
    // Handle simple resource object - but validate against actual config
    else if (resources) {
        // Calculate actual memory to ensure accuracy
        const actualMemory = calculateActualMemoryFromConfig(config);
        console.log('🔍 Resource breakdown - AI returned memory_total:', resources.memory_total);
        console.log('🧮 Resource breakdown - calculated actual:', actualMemory + 'GB');
        
        memoryTotal = `${actualMemory}GB`; // Use calculated value for accuracy
        
        // Calculate correct compute units based on actual MIG profiles
        let totalComputeUnits = 0;
        for (let i = 0; i < config.inferenceJobs; i++) {
            if (config.memoryReq === '40') {
                totalComputeUnits += 2; // 2g.20gb = 2 compute units
            } else if (config.memoryReq === '20') {
                totalComputeUnits += 2; // 2g.20gb = 2 compute units  
            } else {
                totalComputeUnits += 1; // 1g.10gb = 1 compute unit
            }
        }
        
        for (let i = 0; i < config.trainingJobs; i++) {
            if (config.memoryReq === '10') {
                totalComputeUnits += 2; // 2g.20gb = 2 compute units
            } else {
                totalComputeUnits += 3; // 3g.40gb = 3 compute units
            }
        }
        
        // Cap at maximum 7 compute units (H100 limit)
        totalComputeUnits = Math.min(totalComputeUnits, 7);
        
        computeUnits = `${totalComputeUnits}/7`;
        efficiency = resources.efficiency_score || 'N/A';
        
        console.log('✅ Resource breakdown using:', memoryTotal);
    }
    // Fallback calculation - calculate based on actual MIG instance allocations
    else {
        // Calculate realistic MIG instance allocation
        let totalAllocatedMemory = 0;
        let totalComputeUnits = 0;
        
        // For inference jobs - match generateRealisticCommands exactly
        for (let i = 0; i < config.inferenceJobs; i++) {
            if (config.memoryReq === '40') {
                totalAllocatedMemory += 20; // 2g.20gb
                totalComputeUnits += 2;
            } else if (config.memoryReq === '20') {
                totalAllocatedMemory += 20; // 2g.20gb
                totalComputeUnits += 2;
            } else {
                totalAllocatedMemory += 10; // 1g.10gb
                totalComputeUnits += 1;
            }
        }
        
        // For training jobs - typically use larger instances
        for (let i = 0; i < config.trainingJobs; i++) {
            if (config.memoryReq === '10') {
                totalAllocatedMemory += 20; // 2g.20gb
                totalComputeUnits += 2;
            } else {
                totalAllocatedMemory += 40; // 3g.40gb
                totalComputeUnits += 3;
            }
        }
        
        memoryTotal = `${totalAllocatedMemory}GB`;
        computeUnits = `${totalComputeUnits}/7`;
        
        // Calculate efficiency based on actual utilization
        const utilizationRate = (totalAllocatedMemory / 80) * 100;
        efficiency = `${Math.round(utilizationRate)}%`;
    }

    resourceBreakdown.innerHTML = `
        <div class="resource-item">
            <div class="resource-label">Total Memory Allocated</div>
            <div class="resource-value">${memoryTotal}</div>
        </div>
        <div class="resource-item">
            <div class="resource-label">Compute Units</div>
            <div class="resource-value">${computeUnits}</div>
        </div>
        <div class="resource-item">
            <div class="resource-label">Efficiency Score</div>
            <div class="resource-value">${efficiency}</div>
        </div>
        <div class="resource-item">
            <div class="resource-label">Instance Distribution</div>
            <div class="resource-value">${config.inferenceJobs} Inference + ${config.trainingJobs} Training</div>
        </div>
    `;
}

/**
 * Hide all UI states
 */
function hideAllStates() {
    loadingDiv.classList.remove('active');
    errorDiv.classList.remove('active');
    resultsDiv.classList.remove('active');
}

/**
 * Display error with enhanced messaging
 */
function displayError(message) {
    hideAllStates();
    errorMessage.textContent = message;
    errorDiv.classList.add('active');
}

/**
 * Enhanced clipboard functionality
 */
async function copyCommandsToClipboard(commandText = null) {
    const textToCopy = commandText || document.getElementById('copy-commands')?.previousElementSibling?.textContent || '';
    
    if (!navigator.clipboard) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    } else {
        await navigator.clipboard.writeText(textToCopy);
    }
    
    const button = document.getElementById('copy-commands') || copyButton;
    const originalText = button.textContent;
    button.textContent = '✓ Copied';
    button.style.background = 'var(--success)';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
    }, 2000);
}


