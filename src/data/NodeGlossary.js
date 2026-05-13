export const NodeGlossary = [
    {
        type: "regulation", glossary: {
            GDPR: "The General Data Protection Regulation (GDPR) is a comprehensive EU law (effective May 2018) governing data protection and privacy for individuals within the European Economic Area (EEA). It mandates strict rules on collecting, storing, and using personal data, granting individuals enhanced control, such as consent, access, and erasure rights.",
            "EU AI Act": "The EU AI Act is the world's first comprehensive horizontal legal framework for artificial intelligence, designed to regulate AI development and usage within the EU based on a risk-based approach. It prohibits unacceptable risks, imposes strict obligations on high-risk AI, and sets rules for general-purpose AI (GPAI) models.",
            aiact: "The EU AI Act is the world's first comprehensive horizontal legal framework for artificial intelligence, designed to regulate AI development and usage within the EU based on a risk-based approach. It prohibits unacceptable risks, imposes strict obligations on high-risk AI, and sets rules for general-purpose AI (GPAI) models.",
            MDR: "The European Medical Device Regulation (EU) 2017/745 (MDR) governs the design, manufacture, and marketing of medical devices in the EU, focusing on enhanced safety, quality, and traceability. It enforces strict compliance for devices, requiring clinical evidence, post-market surveillance (PMS), and a Unique Device Identification (UDI) system."
        },
    }, {
        type: "principle", glossary: {
            ethics: "It requires that AI use cases respect human values, avoid misuse, and remain under meaningful human oversight.",
            fairness: "It demands the prevention of systemic discrimination and the assurance of equitable outcomes across demographic groups.",
            transparency: "It requires that AI decisions be understandable to users, auditors, and regulators.",
            robustness: "mandates that AI models behave consistently under normal, stressed, and adversarial conditions.",
            privacy: "It calls for the protection of personal and sensitive data throughout the entire AI lifecycle.",
            security: "It addresses the defense of AI systems against adversarial, architectural, and supply-chain attacks.",
            accountability: "It establishes clear lines of compliance and lifecycle governance.",
            "data-quality": "It requires the maintenance of secure, high-integrity data pipelines from training to inference."
        }
    },{
        type: "context-factor", glossary: {
            "cf-9-1": "Indicates whether the system has already been placed on the market and is in commercial use, or is still in pre-market development.",
            "cf-9-2": "Indicates whether there are reasonably foreseeable misuse scenarios that the provider should anticipate during risk analysis.", 
            "cf-9-3": "Indicates whether the system may impact minors or other vulnerable groups (patients, the elderly, people with disabilities).", 
            "cf-9-4": "Indicates whether the system is already subject to a risk management system required by other EU legislation (e.g. MDR, Machinery Regulation).", 
            "cf-10-1": "Indicates whether the provider trains the model on its own dataset, or relies on a pre-trained third-party model without in-house training.", 
            "cf-10-2": "Indicates whether the system processes special categories of personal data under Art. 9 GDPR (health, biometric, genetic, ethnic data, etc.).", 
            "cf-10-3": "Indicates whether the system is designed for a specific geographical, contextual, behavioural or functional setting rather than for generic use.", 
            "cf-13-1": "Indicates whether the system provides technical capabilities to explain its outputs (heatmaps, saliency, feature importance, etc.).", 
            "cf-13-2": "Indicates whether predetermined changes to the system have been declared at the time of conformity assessment (planned versions, periodic retraining).", 
            "cf-13-3": "Indicates whether system performance varies in a documented way across specific groups (by age, ethnicity, gender, clinical subtype).", 
            "cf-14-1": "Indicates whether the system output is a recommendation reviewed and validated by a human, or an automated decision executed without human intervention on the individual event.", 
            "cf-14-2": "Indicates whether the system performs remote biometric identification in 1:N mode (recognising a person against a database), as per Annex III point 1(a) of the AI Act.", 
            "cf-14-3": "Indicates whether the system is used by public authorities for law enforcement, migration, border control or asylum purposes.", 
            "cf-14-4": "Indicates whether it is technically feasible to integrate a stop or suspension mechanism in the system without introducing risks greater than those it prevents.", 
            "cf-15-1": "Indicates whether the system continues to learn after release (online learning, continuous fine-tuning, federated learning), or if the model is locked at deployment.", 
            "cf-15-2": "Indicates whether the system is exposed to data poisoning, i.e. the injection of malicious data into the training or update process.", 
            "cf-15-3": "Indicates whether the system is exposed to data poisoning, i.e. the injection of malicious data into the training or update process.", 
            "cf-15-4": "Indicates whether the system is exposed to model poisoning, typically due to the use of potentially compromised third-party foundation models.",    
            "cf-15-5": "Indicates whether the system is exposed to adversarial examples, i.e. inputs crafted to deceive the model (especially relevant in computer vision and NLP).", 
            "cf-15-6": "Indicates whether the system is exposed to extraction of the model or sensitive data through remote interfaces (APIs, cloud SaaS).", 
            "cf-15-7": "Indicates whether the model is subject to intrinsic flaws (overfitting, training bias, drift): typically true for any ML model.",

            "gdpr-cf-9-1": "",
            "gdpr-cf-9-2": "",
            "gdpr-cf-9-3": "",
            "gdpr-cf-9-4": "",
            "gdpr-cf-9-5": "",
            "gdpr-cf-9-6": "",
            "gdpr-cf-9-7": "",
            "gdpr-cf-35-1": "",
            "gdpr-cf-35-2": "",
            "gdpr-cf-35-3": "",
            "gdpr-cf-35-4": "",
            "gdpr-cf-35-5": "",
            "gdpr-cf-35-6": "",
            "gdpr-cf-35-7": "",
            "gdpr-cf-35-8": "",
            "gdpr-cf-25-1": "",
            "gdpr-cf-25-2": "",
            "gdpr-cf-25-3": "",
            "gdpr-cf-25-4": "",
            "gdpr-cf-25-5": "",
            "gdpr-cf-25-6": "",
            "gdpr-cf-89-1": "",
            "gdpr-cf-89-2": "",
            "gdpr-cf-89-3": "",
            "gdpr-cf-89-4": "",
            "gdpr-cf-89-5": "",
            "gdpr-cf-89-6": ""
        }
    }, {
        type: "goal", glossary: {
            "goal-9": "",
            "goal-10": "",
            "goal-11": "",
            "goal-12": "",
            "goal-13": "",
            "goal-14": "",
            "goal-15": "",
        }
    }, {
        type: "subgoal", glossary: {
            "subgoal-9-1": "",
            "subgoal-9-2": "",
            "subgoal-9-3": "",
            "subgoal-9-4": "",
            "subgoal-9-5": "",
            "subgoal-9-6": "",

            "subgoal-10-1": "",
            "subgoal-10-2": "",
            "subgoal-10-3": "",
            "subgoal-10-4": "",
            "subgoal-10-5": "",
            "subgoal-10-6": "",

            "subgoal-13-1": "",
            "subgoal-13-2": "",
            "subgoal-13-3": "",
            "subgoal-13-4": "",
            "subgoal-13-5": "",
            "subgoal-13-6": "",
            "subgoal-13-7": "",

            "subgoal-14-1": "",
            "subgoal-14-2": "",
            "subgoal-14-3": "",
            "subgoal-14-4": "",
            "subgoal-14-5": "",
            "subgoal-14-6": "",
            "subgoal-14-7": "",
            "subgoal-14-8": "",

            "subgoal-15-1": "",
            "subgoal-15-2": "",
            "subgoal-15-3": "",
            "subgoal-15-4": "",
            "subgoal-15-5": ""
        }
    }
]
