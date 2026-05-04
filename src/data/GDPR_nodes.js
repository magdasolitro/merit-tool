export const raw_GDPRNodes = [
  {
    id: "gdpr-compliance",
    type: "root",
    data: {
      isHidden: false,
      label: "GDPR_Compliance",
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
        parentId: "gdpr-compliance",
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
        parentId: "gdpr-compliance",
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
        parentId: "gdpr-compliance",
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
        parentId: "gdpr-compliance",
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

