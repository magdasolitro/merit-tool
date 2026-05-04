export const raw_ComplianceNodes = [
  {
    id: "unified-compliance-framework",
    type: "root",
    data: {
      isHidden: false,
      label: "Unified_Compliance_Framework",
      top: "no"
    },
    draggable: false,
    children: [
      {
        id: "goal-9",
        type: "goal",
        data: {
          isHidden: false,
          label: "GOAL 9-GDPR — Ensure lawful processing of special categories of personal data by establishing a valid legal basis and applying appropriate safeguards"
        },
        draggable: false,
        parentId: "unified-compliance-framework",
        children: [
          {
            id: "subgoal-9-1",
            type: "subgoal",
            parentId: "goal-9",
            data: {
              isHidden: false,
              label: "SUBGOAL 9-GDPR.1 — Identify and apply a valid legal basis from Art. 9(2) authorising the processing of special category data"
            },
            draggable: false,
            children: null
          },
          {
            id: "subgoal-9-2",
            type: "subgoal",
            parentId: "goal-9",
            data: {
              isHidden: false,
              label: "SUBGOAL 9-GDPR.2 — Ensure processing for health/medical purposes is carried out under professional secrecy obligation (Art. 9(3))"
            },
            draggable: false,
            children: null
          },
          {
            id: "subgoal-9-3",
            type: "subgoal",
            parentId: "goal-9",
            data: {
              isHidden: false,
              label: "SUBGOAL 9-GDPR.3 — Ensure processing for scientific research purposes complies with Art. 89(1) conditions"
            },
            draggable: false,
            children: null
          },
          {
            id: "subgoal-9-4",
            type: "subgoal",
            parentId: "goal-9",
            data: {
              isHidden: false,
              label: "SUBGOAL 9-GDPR.4 — Verify applicability of Member State additional conditions or limitations for genetic, biometric or health data"
            },
            draggable: false,
            children: null
          },

          {
            id: "dc-9-1",
            type: "domain-constraint",
            parentId: "goal-9",
            data: {
              isHidden: false,
              label: "DC 9-GDPR.1 — Processing of special categories of personal data is prohibited by default → appartiene a GOAL 9-GDPR"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-9-2",
            type: "domain-constraint",
            parentId: "subgoal-9-1",
            data: {
              isHidden: false,
              label: "DC 9-GDPR.2 — Explicit consent of the data subject constitutes a valid legal basis, unless Union or Member State law prohibits lifting the prohibition → appartiene a SUBGOAL 9-GDPR.1"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-9-3",
            type: "domain-constraint",
            parentId: "subgoal-9-1",
            data: {
              isHidden: false,
              label: "DC 9-GDPR.3 — Processing necessary for employment/social security/social protection obligations is permitted only where authorised by Union or Member State law or collective agreement with appropriate safeguards → appartiene a SUBGOAL 9-GDPR.1"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-9-4",
            type: "domain-constraint",
            parentId: "subgoal-9-1",
            data: {
              isHidden: false,
              label: "DC 9-GDPR.4 — Processing to protect vital interests is permitted only where data subject is physically or legally incapable of giving consent → appartiene a SUBGOAL 9-GDPR.1"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-9-5",
            type: "domain-constraint",
            parentId: "subgoal-9-1",
            data: {
              isHidden: false,
              label: "DC 9-GDPR.5 — Processing for reasons of substantial public interest must be based on Union or Member State law, proportionate to the aim, and provide suitable and specific safeguards → appartiene a SUBGOAL 9-GDPR.1"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-9-6",
            type: "domain-constraint",
            parentId: "subgoal-9-1",
            data: {
              isHidden: false,
              label: "DC 9-GDPR.6 — Processing for preventive/occupational medicine, medical diagnosis, health or social care provision must be based on Union or Member State law or contract with a health professional → appartiene a SUBGOAL 9-GDPR.1"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-9-7",
            type: "domain-constraint",
            parentId: "subgoal-9-1",
            data: {
              isHidden: false,
              label: "DC 9-GDPR.7 — Processing for public health interest must be based on Union or Member State law and provide suitable safeguards including professional secrecy → appartiene a SUBGOAL 9-GDPR.1"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-9-8",
            type: "domain-constraint",
            parentId: "subgoal-9-3",
            data: {
              isHidden: false,
              label: "DC 9-GDPR.8 — Processing for scientific/historical research or statistical purposes must comply with Art. 89(1) and be based on Union or Member State law → appartiene a SUBGOAL 9-GDPR.3"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-9-9",
            type: "domain-constraint",
            parentId: "subgoal-9-2",
            data: {
              isHidden: false,
              label: "DC 9-GDPR.9 — Processing for health/medical purposes must be performed by or under responsibility of a person subject to professional secrecy → appartiene a SUBGOAL 9-GDPR.2"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-9-10",
            type: "domain-constraint",
            parentId: "subgoal-9-4",
            data: {
              isHidden: false,
              label: "DC 9-GDPR.10 — Member States may maintain or introduce further conditions and limitations for genetic data, biometric data and health data → appartiene a SUBGOAL 9-GDPR.4"
            },
            draggable: false,
            children: null
          },

          {
            id: "qc-9-1",
            type: "quality-constraint",
            parentId: "subgoal-9-1",
            data: {
              isHidden: false,
              label: "QC 9-GDPR.1 — Legal basis for substantial public interest processing must be proportionate to the aim pursued and respect the essence of the right to data protection → appartiene a SUBGOAL 9-GDPR.1"
            },
            draggable: false,
            children: null
          },
          {
            id: "qc-9-2",
            type: "quality-constraint",
            parentId: "goal-9",
            data: {
              isHidden: false,
              label: "QC 9-GDPR.2 — Safeguards for special category processing must be suitable and specific to the fundamental rights and interests at stake → appartiene a GOAL 9-GDPR"
            },
            draggable: false,
            children: null
          },
          {
            id: "qc-9-3",
            type: "quality-constraint",
            parentId: "subgoal-9-2",
            data: {
              isHidden: false,
              label: "QC 9-GDPR.3 — Professional secrecy obligation must be established under Union/Member State law or national competent body rules → appartiene a SUBGOAL 9-GDPR.2"
            },
            draggable: false,
            children: null
          },

          {
            id: "cf-9-1",
            type: "context-factor",
            parentId: "goal-9",
            data: {
              isHidden: false,
              label: "CF 9-GDPR.1 — special_category_type"
            },
            draggable: false,
            children: null
          },
          {
            id: "cf-9-2",
            type: "context-factor",
            parentId: "goal-9",
            data: {
              isHidden: false,
              label: "CF 9-GDPR.2 — legal_basis_selected"
            },
            draggable: false,
            children: null
          }
        ]
      },

      {
        id: "goal-35",
        type: "goal",
        data: {
          isHidden: false,
          label: "GOAL 35-GDPR — Carry out, document and maintain a Data Protection Impact Assessment (DPIA) prior to processing operations likely to result in high risk to rights and freedoms of natural persons"
        },
        draggable: false,
        parentId: "unified-compliance-framework",
        children: [
          {
            id: "subgoal-35-1",
            type: "subgoal",
            parentId: "goal-35",
            data: {
              isHidden: false,
              label: "SUBGOAL 35-GDPR.1 — Determine whether a DPIA is required based on nature, scope, context, purposes and risk level of processing"
            },
            draggable: false,
            children: null
          },
          {
            id: "subgoal-35-2",
            type: "subgoal",
            parentId: "goal-35",
            data: {
              isHidden: false,
              label: "SUBGOAL 35-GDPR.2 — Consult the Data Protection Officer in the DPIA process where designated"
            },
            draggable: false,
            children: null
          },
          {
            id: "subgoal-35-3",
            type: "subgoal",
            parentId: "goal-35",
            data: {
              isHidden: false,
              label: "SUBGOAL 35-GDPR.3 — Produce a DPIA containing all mandatory elements per Art. 35(7)"
            },
            draggable: false,
            children: null
          },

          {
            id: "dc-35-1",
            type: "domain-constraint",
            parentId: "goal-35",
            data: {
              isHidden: false,
              label: "DC 35-GDPR.1 — DPIA must be carried out prior to processing, not after commencement → appartiene a GOAL 35-GDPR"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-35-2",
            type: "domain-constraint",
            parentId: "subgoal-35-1",
            data: {
              isHidden: false,
              label: "DC 35-GDPR.2 — DPIA is mandatory for systematic and extensive evaluation based on automated processing → appartiene a SUBGOAL 35-GDPR.1"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-35-7",
            type: "domain-constraint",
            parentId: "subgoal-35-3",
            data: {
              isHidden: false,
              label: "DC 35-GDPR.7 — DPIA must contain description, proportionality assessment, risk assessment and mitigation measures → appartiene a SUBGOAL 35-GDPR.3"
            },
            draggable: false,
            children: null
          },

          {
            id: "qc-35-1",
            type: "quality-constraint",
            parentId: "subgoal-35-3",
            data: {
              isHidden: false,
              label: "QC 35-GDPR.1 — DPIA must systematically describe processing operations → appartiene a SUBGOAL 35-GDPR.3"
            },
            draggable: false,
            children: null
          },

          {
            id: "cf-35-1",
            type: "context-factor",
            parentId: "goal-35",
            data: {
              isHidden: false,
              label: "CF 35-GDPR.1 — automated_decision_making_with_significant_effects"
            },
            draggable: false,
            children: null
          }
        ]
      },

      {
        id: "goal-25",
        type: "goal",
        data: {
          isHidden: false,
          label: "GOAL 25-GDPR — Implement appropriate technical and organisational measures to embed data protection principles into processing systems and ensure data protection by design and by default"
        },
        draggable: false,
        parentId: "unified-compliance-framework",
        children: [
          {
            id: "subgoal-25-1",
            type: "subgoal",
            parentId: "goal-25",
            data: {
              isHidden: false,
              label: "SUBGOAL 25-GDPR.1 — Implement data protection measures at the time of determining the means for processing"
            },
            draggable: false,
            children: null
          },
          {
            id: "subgoal-25-3",
            type: "subgoal",
            parentId: "goal-25",
            data: {
              isHidden: false,
              label: "SUBGOAL 25-GDPR.3 — Ensure by default only personal data necessary for each specific purpose is processed"
            },
            draggable: false,
            children: null
          },

          {
            id: "dc-25-1",
            type: "domain-constraint",
            parentId: "goal-25",
            data: {
              isHidden: false,
              label: "DC 25-GDPR.1 — Technical and organisational measures must be implemented both at design time and at time of processing → appartiene a GOAL 25-GDPR"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-25-3",
            type: "domain-constraint",
            parentId: "subgoal-25-3",
            data: {
              isHidden: false,
              label: "DC 25-GDPR.3 — By default, only personal data necessary for each specific purpose shall be processed → appartiene a SUBGOAL 25-GDPR.3"
            },
            draggable: false,
            children: null
          },

          {
            id: "qc-25-1",
            type: "quality-constraint",
            parentId: "goal-25",
            data: {
              isHidden: false,
              label: "QC 25-GDPR.1 — Measures must be appropriate considering state of the art, cost, risks and context → appartiene a GOAL 25-GDPR"
            },
            draggable: false,
            children: null
          },

          {
            id: "cf-25-1",
            type: "context-factor",
            parentId: "goal-25",
            data: {
              isHidden: false,
              label: "CF 25-GDPR.1 — design_phase_active"
            },
            draggable: false,
            children: null
          }
        ]
      },

      {
        id: "goal-89",
        type: "goal",
        data: {
          isHidden: false,
          label: "GOAL 89-GDPR — Ensure processing for scientific research, archiving in the public interest or statistical purposes is subject to appropriate safeguards"
        },
        draggable: false,
        parentId: "unified-compliance-framework",
        children: [
          {
            id: "subgoal-89-1",
            type: "subgoal",
            parentId: "goal-89",
            data: {
              isHidden: false,
              label: "SUBGOAL 89-GDPR.1 — Implement appropriate technical and organisational safeguards ensuring data minimisation"
            },
            draggable: false,
            children: null
          },
          {
            id: "subgoal-89-2",
            type: "subgoal",
            parentId: "goal-89",
            data: {
              isHidden: false,
              label: "SUBGOAL 89-GDPR.2 — Apply anonymisation or pseudonymisation where possible"
            },
            draggable: false,
            children: null
          },

          {
            id: "dc-89-1",
            type: "domain-constraint",
            parentId: "goal-89",
            data: {
              isHidden: false,
              label: "DC 89-GDPR.1 — Processing for research/archiving/statistical purposes must be subject to appropriate safeguards → appartiene a GOAL 89-GDPR"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-89-2",
            type: "domain-constraint",
            parentId: "subgoal-89-1",
            data: {
              isHidden: false,
              label: "DC 89-GDPR.2 — Safeguards must ensure technical and organisational measures are in place to respect data minimisation → appartiene a SUBGOAL 89-GDPR.1"
            },
            draggable: false,
            children: null
          },
          {
            id: "dc-89-3",
            type: "domain-constraint",
            parentId: "subgoal-89-2",
            data: {
              isHidden: false,
              label: "DC 89-GDPR.3 — Non-identifying processing must be used where possible → appartiene a SUBGOAL 89-GDPR.2"
            },
            draggable: false,
            children: null
          },

          {
            id: "qc-89-1",
            type: "quality-constraint",
            parentId: "subgoal-89-2",
            data: {
              isHidden: false,
              label: "QC 89-GDPR.1 — Pseudonymisation should be applied where technically feasible → appartiene a SUBGOAL 89-GDPR.2"
            },
            draggable: false,
            children: null
          },

          {
            id: "cf-89-1",
            type: "context-factor",
            parentId: "goal-89",
            data: {
              isHidden: false,
              label: "CF 89-GDPR.1 — research_purpose_type"
            },
            draggable: false,
            children: null
          }
        ]
      }
    ]
  }
];
```

## File unificato AI Act + GDPR

Il file ora rappresenta un framework unico che combina:

* AI Act compliance nodes
* GDPR compliance nodes

Struttura root:

```javascript
{
  id: "unified-compliance-framework",
  type: "root",
  data: {
    label: "Unified_Compliance_Framework"
  }
}
```

### Come effettuare il merge completo

Nel file finale:

1. Mantieni tutti i nodi originali AI Act (`goal-8`, `goal-9`, `goal-10`, ecc.)
2. Aggiungi successivamente tutti i goal GDPR:

   * `goal-9`
   * `goal-25`
   * `goal-35`
   * `goal-89`
3. Tutti i goal devono avere:

```javascript
parentId: "unified-compliance-framework"
```

4. Tutti i subgoal GDPR mantengono:

```javascript
parentId: "goal-XX"
```

5. Tutti i DC/QC/CF mantengono il parent derivato da:

* `→ appartiene a GOAL ...`
* `→ appartiene a SUBGOAL ...`

## Convenzioni applicate

* Root node: `GDPR_Compliance`
* Ogni `subgoal-X-Y` ha `parentId: goal-X`
* Ogni constraint/factor usa il `parentId` derivato dalla dicitura:

  * `→ appartiene a GOAL ...` → parentId = goal
  * `→ appartiene a SUBGOAL ...` → parentId = relativo subgoal
* Naming normalizzato:

  * goal → `goal-XX`
  * subgoal → `subgoal-XX-N`
  * domain constraint → `dc-XX-N`
  * quality constraint → `qc-XX-N`
  * context factor → `cf-XX-N`

## Nota

Sono stati ora inclusi anche i nodi restanti relativi ai GOAL 35-GDPR, 25-GDPR e 89-GDPR con i rispettivi subgoal, domain constraints, quality constraints e context factors.

Di seguito trovi i blocchi aggiuntivi da inserire dentro `children` del nodo root `gdpr-compliance`.

```javascript
// --- COMPLETAMENTO GOAL 35 GDPR ---
{
  id: "subgoal-35-4",
  type: "subgoal",
  parentId: "goal-35",
  data: {
    isHidden: false,
    label: "SUBGOAL 35-GDPR.4 — Seek views of data subjects or their representatives on intended processing where appropriate"
  },
  draggable: false,
  children: null
},
{
  id: "subgoal-35-5",
  type: "subgoal",
  parentId: "goal-35",
  data: {
    isHidden: false,
    label: "SUBGOAL 35-GDPR.5 — Review and update the DPIA when the risk represented by processing changes"
  },
  draggable: false,
  children: null
},
{
  id: "subgoal-35-6",
  type: "subgoal",
  parentId: "goal-35",
  data: {
    isHidden: false,
    label: "SUBGOAL 35-GDPR.6 — Verify whether an exemption from DPIA obligation applies"
  },
  draggable: false,
  children: null
},
{
  id: "dc-35-3",
  type: "domain-constraint",
  parentId: "subgoal-35-1",
  data: {
    isHidden: false,
    label: "DC 35-GDPR.3 — DPIA is mandatory for large-scale processing of special categories of data → appartiene a SUBGOAL 35-GDPR.1"
  },
  draggable: false,
  children: null
},
{
  id: "dc-35-4",
  type: "domain-constraint",
  parentId: "subgoal-35-1",
  data: {
    isHidden: false,
    label: "DC 35-GDPR.4 — DPIA is mandatory for systematic monitoring of publicly accessible areas on a large scale → appartiene a SUBGOAL 35-GDPR.1"
  },
  draggable: false,
  children: null
},
{
  id: "dc-35-5",
  type: "domain-constraint",
  parentId: "goal-35",
  data: {
    isHidden: false,
    label: "DC 35-GDPR.5 — A single DPIA may cover similar processing operations presenting similar risks → appartiene a GOAL 35-GDPR"
  },
  draggable: false,
  children: null
},
{
  id: "dc-35-6",
  type: "domain-constraint",
  parentId: "subgoal-35-2",
  data: {
    isHidden: false,
    label: "DC 35-GDPR.6 — Controller must seek advice of the designated DPO when carrying out a DPIA → appartiene a SUBGOAL 35-GDPR.2"
  },
  draggable: false,
  children: null
},
{
  id: "dc-35-8",
  type: "domain-constraint",
  parentId: "subgoal-35-3",
  data: {
    isHidden: false,
    label: "DC 35-GDPR.8 — Compliance with approved codes of conduct must be considered in assessing impact → appartiene a SUBGOAL 35-GDPR.3"
  },
  draggable: false,
  children: null
},
{
  id: "dc-35-9",
  type: "domain-constraint",
  parentId: "subgoal-35-6",
  data: {
    isHidden: false,
    label: "DC 35-GDPR.9 — Prior general impact assessments may exempt from DPIA obligations in some cases → appartiene a SUBGOAL 35-GDPR.6"
  },
  draggable: false,
  children: null
},
{
  id: "dc-35-10",
  type: "domain-constraint",
  parentId: "subgoal-35-5",
  data: {
    isHidden: false,
    label: "DC 35-GDPR.10 — Controller must review DPIA when risk changes → appartiene a SUBGOAL 35-GDPR.5"
  },
  draggable: false,
  children: null
},
{
  id: "dc-35-11",
  type: "domain-constraint",
  parentId: "subgoal-35-1",
  data: {
    isHidden: false,
    label: "DC 35-GDPR.11 — Supervisory authority must publish list of processing operations requiring DPIA → appartiene a SUBGOAL 35-GDPR.1"
  },
  draggable: false,
  children: null
},
{
  id: "qc-35-2",
  type: "quality-constraint",
  parentId: "subgoal-35-3",
  data: {
    isHidden: false,
    label: "QC 35-GDPR.2 — Necessity and proportionality assessment must be genuine → appartiene a SUBGOAL 35-GDPR.3"
  },
  draggable: false,
  children: null
},
{
  id: "qc-35-3",
  type: "quality-constraint",
  parentId: "subgoal-35-3",
  data: {
    isHidden: false,
    label: "QC 35-GDPR.3 — Risk mitigation measures must sufficiently address identified risks → appartiene a SUBGOAL 35-GDPR.3"
  },
  draggable: false,
  children: null
},
{
  id: "qc-35-4",
  type: "quality-constraint",
  parentId: "subgoal-35-4",
  data: {
    isHidden: false,
    label: "QC 35-GDPR.4 — Views of data subjects must be sought where appropriate → appartiene a SUBGOAL 35-GDPR.4"
  },
  draggable: false,
  children: null
},
{
  id: "qc-35-5",
  type: "quality-constraint",
  parentId: "subgoal-35-5",
  data: {
    isHidden: false,
    label: "QC 35-GDPR.5 — DPIA review timing must be appropriate to risk changes → appartiene a SUBGOAL 35-GDPR.5"
  },
  draggable: false,
  children: null
},
{
  id: "cf-35-2",
  type: "context-factor",
  parentId: "goal-35",
  data: {
    isHidden: false,
    label: "CF 35-GDPR.2 — large_scale_special_category_processing"
  },
  draggable: false,
  children: null
},
{
  id: "cf-35-3",
  type: "context-factor",
  parentId: "goal-35",
  data: {
    isHidden: false,
    label: "CF 35-GDPR.3 — dpo_designated"
  },
  draggable: false,
  children: null
},
{
  id: "cf-35-4",
  type: "context-factor",
  parentId: "goal-35",
  data: {
    isHidden: false,
    label: "CF 35-GDPR.4 — supervisory_authority_list_applicable"
  },
  draggable: false,
  children: null
},

// --- COMPLETAMENTO GOAL 25 GDPR ---
{
  id: "subgoal-25-2",
  type: "subgoal",
  parentId: "goal-25",
  data: {
    isHidden: false,
    label: "SUBGOAL 25-GDPR.2 — Implement data protection measures at the time of processing itself"
  },
  draggable: false,
  children: null
},
{
  id: "subgoal-25-4",
  type: "subgoal",
  parentId: "goal-25",
  data: {
    isHidden: false,
    label: "SUBGOAL 25-GDPR.4 — Demonstrate compliance through approved certification mechanism"
  },
  draggable: false,
  children: null
},
{
  id: "dc-25-2",
  type: "domain-constraint",
  parentId: "subgoal-25-1",
  data: {
    isHidden: false,
    label: "DC 25-GDPR.2 — Measures must implement data-protection principles effectively → appartiene a SUBGOAL 25-GDPR.1"
  },
  draggable: false,
  children: null
},
{
  id: "dc-25-4",
  type: "domain-constraint",
  parentId: "subgoal-25-3",
  data: {
    isHidden: false,
    label: "DC 25-GDPR.4 — Personal data must not be accessible by default without intervention → appartiene a SUBGOAL 25-GDPR.3"
  },
  draggable: false,
  children: null
},
{
  id: "dc-25-5",
  type: "domain-constraint",
  parentId: "subgoal-25-4",
  data: {
    isHidden: false,
    label: "DC 25-GDPR.5 — Certification mechanisms may support compliance demonstration → appartiene a SUBGOAL 25-GDPR.4"
  },
  draggable: false,
  children: null
},
{
  id: "qc-25-2",
  type: "quality-constraint",
  parentId: "subgoal-25-3",
  data: {
    isHidden: false,
    label: "QC 25-GDPR.2 — Data minimisation must be demonstrably effective → appartiene a SUBGOAL 25-GDPR.3"
  },
  draggable: false,
  children: null
},
{
  id: "qc-25-3",
  type: "quality-constraint",
  parentId: "subgoal-25-1",
  data: {
    isHidden: false,
    label: "QC 25-GDPR.3 — Pseudonymisation should be applied where technically feasible → appartiene a SUBGOAL 25-GDPR.1"
  },
  draggable: false,
  children: null
},
{
  id: "qc-25-4",
  type: "quality-constraint",
  parentId: "subgoal-25-3",
  data: {
    isHidden: false,
    label: "QC 25-GDPR.4 — Default settings must be privacy-protective → appartiene a SUBGOAL 25-GDPR.3"
  },
  draggable: false,
  children: null
},

// --- COMPLETAMENTO GOAL 89 GDPR ---
{
  id: "subgoal-89-3",
  type: "subgoal",
  parentId: "goal-89",
  data: {
    isHidden: false,
    label: "SUBGOAL 89-GDPR.3 — Apply derogations from data subject rights for scientific/historical research or statistical purposes"
  },
  draggable: false,
  children: null
},
{
  id: "subgoal-89-4",
  type: "subgoal",
  parentId: "goal-89",
  data: {
    isHidden: false,
    label: "SUBGOAL 89-GDPR.4 — Apply derogations for archiving in the public interest"
  },
  draggable: false,
  children: null
},
{
  id: "subgoal-89-5",
  type: "subgoal",
  parentId: "goal-89",
  data: {
    isHidden: false,
    label: "SUBGOAL 89-GDPR.5 — Limit scope of derogations to research/statistical processing only"
  },
  draggable: false,
  children: null
},
{
  id: "dc-89-4",
  type: "domain-constraint",
  parentId: "subgoal-89-3",
  data: {
    isHidden: false,
    label: "DC 89-GDPR.4 — Derogations are permitted only where provided by Union or Member State law → appartiene a SUBGOAL 89-GDPR.3"
  },
  draggable: false,
  children: null
},
{
  id: "dc-89-5",
  type: "domain-constraint",
  parentId: "subgoal-89-3",
  data: {
    isHidden: false,
    label: "DC 89-GDPR.5 — Derogations are permitted only where rights would seriously impair research purposes → appartiene a SUBGOAL 89-GDPR.3"
  },
  draggable: false,
  children: null
},
{
  id: "dc-89-6",
  type: "domain-constraint",
  parentId: "subgoal-89-3",
  data: {
    isHidden: false,
    label: "DC 89-GDPR.6 — Derogations are permitted only where necessary → appartiene a SUBGOAL 89-GDPR.3"
  },
  draggable: false,
  children: null
},
{
  id: "dc-89-7",
  type: "domain-constraint",
  parentId: "subgoal-89-4",
  data: {
    isHidden: false,
    label: "DC 89-GDPR.7 — Archiving derogations require Union or Member State law → appartiene a SUBGOAL 89-GDPR.4"
  },
  draggable: false,
  children: null
},
{
  id: "dc-89-8",
  type: "domain-constraint",
  parentId: "subgoal-89-5",
  data: {
    isHidden: false,
    label: "DC 89-GDPR.8 — Derogations apply only to the research/statistical component in dual-purpose processing → appartiene a SUBGOAL 89-GDPR.5"
  },
  draggable: false,
  children: null
},
{
  id: "qc-89-2",
  type: "quality-constraint",
  parentId: "subgoal-89-3",
  data: {
    isHidden: false,
    label: "QC 89-GDPR.2 — Derogations must be proportionate and strictly necessary → appartiene a SUBGOAL 89-GDPR.3"
  },
  draggable: false,
  children: null
},
{
  id: "qc-89-3",
  type: "quality-constraint",
  parentId: "subgoal-89-5",
  data: {
    isHidden: false,
    label: "QC 89-GDPR.3 — Research and non-research components must remain distinguishable → appartiene a SUBGOAL 89-GDPR.5"
  },
  draggable: false,
  children: null
},
{
  id: "cf-89-2",
  type: "context-factor",
  parentId: "goal-89",
  data: {
    isHidden: false,
    label: "CF 89-GDPR.2 — identification_necessary_for_purpose"
  },
  draggable: false,
  children: null
},
{
  id: "cf-89-3",
  type: "context-factor",
  parentId: "goal-89",
  data: {
    isHidden: false,
    label: "CF 89-GDPR.3 — member_state_derogation_law"
  },
  draggable: false,
  children: null
},
{
  id: "cf-89-4",
  type: "context-factor",
  parentId: "goal-89",
  data: {
    isHidden: false,
    label: "CF 89-GDPR.4 — data_subject_rights_impairment_risk"
  },
  draggable: false,
  children: null
},
{
  id: "cf-89-5",
  type: "context-factor",
  parentId: "goal-89",
  data: {
    isHidden: false,
    label: "CF 89-GDPR.5 — dual_purpose_processing"
  },
  draggable: false,
  children: null
},
{
  id: "cf-89-6",
  type: "context-factor",
  parentId: "goal-89",
  data: {
    isHidden: false,
    label: "CF 89-GDPR.6 — pseudonymisation_sufficient_for_purpose"
  },
  draggable: false,
  children: null
}

