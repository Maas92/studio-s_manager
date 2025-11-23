import type { Treatment } from "./api";

export const mockTreatments: Treatment[] = [
  {
    id: "treatment_1",
    name: "Classic Facial",
    description:
      "A deep cleansing and rejuvenating facial treatment perfect for all skin types. Includes cleansing, exfoliation, extraction, mask, and moisturization.",
    durationMinutes: 60,
    price: 75.0,
    category: "Facial",
    benefits: [
      "Deep cleansing",
      "Improved skin texture",
      "Reduced fine lines",
      "Hydrated skin",
      "Relaxation",
    ],
    contraindications: [
      "Active acne breakout",
      "Recent chemical peel",
      "Sunburn",
    ],
    preparationInstructions:
      "Arrive with clean skin, no makeup. Avoid sun exposure 24 hours before treatment.",
    aftercareInstructions:
      "Avoid sun exposure for 24 hours. Apply SPF 30+ daily. Keep skin hydrated.",
    availableFor: ["staff_1", "staff_3"],
    imageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881",
    isActive: true,
    popularityScore: 92,
    tags: ["relaxing", "rejuvenating", "beginner-friendly"],
  },
  {
    id: "treatment_2",
    name: "Anti-Aging Facial",
    description:
      "Advanced facial treatment targeting signs of aging with peptides and antioxidants. Promotes collagen production and reduces wrinkles.",
    durationMinutes: 75,
    price: 120.0,
    category: "Facial",
    benefits: [
      "Reduces wrinkles",
      "Firms skin",
      "Boosts collagen",
      "Brightens complexion",
      "Long-lasting results",
    ],
    contraindications: [
      "Pregnancy",
      "Active skin infection",
      "Recent Botox treatment",
    ],
    preparationInstructions:
      "Discontinue retinol products 3 days before. Arrive makeup-free.",
    aftercareInstructions:
      "Use gentle products for 48 hours. Apply recommended serums. Avoid direct sun.",
    availableFor: ["staff_1", "staff_3"],
    imageUrl: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937",
    isActive: true,
    popularityScore: 88,
    tags: ["anti-aging", "premium", "collagen-boosting"],
  },
  {
    id: "treatment_3",
    name: "Swedish Massage",
    description:
      "Full body relaxation massage using long, flowing strokes to reduce tension and promote circulation.",
    durationMinutes: 60,
    price: 85.0,
    category: "Massage",
    benefits: [
      "Stress relief",
      "Muscle relaxation",
      "Improved circulation",
      "Better sleep",
      "Pain reduction",
    ],
    contraindications: [
      "Fever or infection",
      "Recent surgery",
      "Severe osteoporosis",
      "Blood clots",
    ],
    preparationInstructions:
      "Avoid heavy meals 2 hours before. Communicate any problem areas to therapist.",
    aftercareInstructions:
      "Drink plenty of water. Rest for the remainder of the day. Avoid strenuous activity.",
    availableFor: ["staff_2", "staff_4"],
    imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874",
    isActive: true,
    popularityScore: 95,
    tags: ["relaxation", "full-body", "stress-relief"],
  },
  {
    id: "treatment_4",
    name: "Deep Tissue Massage",
    description:
      "Therapeutic massage targeting deep muscle layers to release chronic tension and knots.",
    durationMinutes: 75,
    price: 110.0,
    category: "Massage",
    benefits: [
      "Releases chronic tension",
      "Breaks up scar tissue",
      "Improves mobility",
      "Reduces inflammation",
      "Treats injuries",
    ],
    contraindications: [
      "Bleeding disorders",
      "Recent fractures",
      "Advanced osteoporosis",
      "Severe varicose veins",
    ],
    preparationInstructions:
      "Hydrate well before treatment. Inform therapist of pain tolerance level.",
    aftercareInstructions:
      "Expect some soreness for 24-48 hours. Apply ice if needed. Stay hydrated.",
    availableFor: ["staff_2", "staff_4"],
    imageUrl: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1",
    isActive: true,
    popularityScore: 78,
    tags: ["therapeutic", "intensive", "pain-relief"],
  },
  {
    id: "treatment_5",
    name: "Gel Manicure",
    description:
      "Long-lasting gel polish application with nail shaping, cuticle care, and hand massage.",
    durationMinutes: 45,
    price: 45.0,
    category: "Nails",
    benefits: [
      "Lasts 2-3 weeks",
      "Chip-resistant",
      "High shine finish",
      "Quick drying",
      "Strengthens nails",
    ],
    contraindications: [
      "Nail fungus",
      "Severely damaged nails",
      "Allergic to gel products",
    ],
    preparationInstructions:
      "Remove old polish. Keep nails trimmed. Moisturize hands.",
    aftercareInstructions:
      "Avoid water for 2 hours. Use cuticle oil daily. Wear gloves for housework.",
    availableFor: ["staff_5", "staff_6"],
    imageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371",
    isActive: true,
    popularityScore: 90,
    tags: ["nails", "gel", "long-lasting"],
  },
  {
    id: "treatment_6",
    name: "Spa Pedicure",
    description:
      "Luxurious foot treatment including soak, exfoliation, massage, and polish application.",
    durationMinutes: 60,
    price: 55.0,
    category: "Nails",
    benefits: [
      "Soft, smooth feet",
      "Removed calluses",
      "Relaxed muscles",
      "Improved circulation",
      "Beautiful nails",
    ],
    contraindications: [
      "Open wounds",
      "Diabetic neuropathy",
      "Foot infections",
    ],
    preparationInstructions:
      "Wear open-toed shoes. Remove old polish if possible.",
    aftercareInstructions:
      "Avoid tight shoes for 24 hours. Moisturize feet daily. Touch up polish as needed.",
    availableFor: ["staff_5", "staff_6"],
    imageUrl: "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8",
    isActive: true,
    popularityScore: 85,
    tags: ["pedicure", "foot-care", "relaxing"],
  },
  {
    id: "treatment_7",
    name: "Microdermabrasion",
    description:
      "Non-invasive exfoliation treatment that removes dead skin cells and promotes cell renewal.",
    durationMinutes: 45,
    price: 95.0,
    category: "Facial",
    benefits: [
      "Reduces fine lines",
      "Evens skin tone",
      "Minimizes pores",
      "Fades scars",
      "Brightens complexion",
    ],
    contraindications: [
      "Active acne",
      "Rosacea",
      "Eczema",
      "Recent laser treatment",
    ],
    preparationInstructions:
      "Avoid exfoliating products for 1 week. No waxing 3 days before.",
    aftercareInstructions:
      "Use gentle cleanser. Apply SPF 50+. Avoid makeup for 24 hours.",
    availableFor: ["staff_1", "staff_3"],
    imageUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2",
    isActive: true,
    popularityScore: 72,
    tags: ["exfoliation", "resurfacing", "advanced"],
  },
  {
    id: "treatment_8",
    name: "Hot Stone Massage",
    description:
      "Therapeutic massage using heated smooth stones to melt away tension and stress.",
    durationMinutes: 90,
    price: 130.0,
    category: "Massage",
    benefits: [
      "Deep relaxation",
      "Releases tension",
      "Improves circulation",
      "Reduces anxiety",
      "Eases muscle stiffness",
    ],
    contraindications: [
      "Pregnancy",
      "High blood pressure",
      "Heart conditions",
      "Varicose veins",
    ],
    preparationInstructions:
      "Eat light beforehand. Inform therapist of temperature preference.",
    aftercareInstructions:
      "Drink water. Rest and relax. Avoid alcohol for 24 hours.",
    availableFor: ["staff_2", "staff_4"],
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef",
    isActive: true,
    popularityScore: 81,
    tags: ["luxury", "therapeutic", "hot-stones"],
  },
  {
    id: "treatment_9",
    name: "Eyebrow Tinting & Shaping",
    description:
      "Professional eyebrow shaping and tinting service for defined, polished brows.",
    durationMinutes: 30,
    price: 35.0,
    category: "Beauty",
    benefits: [
      "Defined brows",
      "No daily makeup needed",
      "Lasts 4-6 weeks",
      "Enhanced facial features",
      "Natural look",
    ],
    contraindications: [
      "Allergic to dyes",
      "Eye infections",
      "Very sensitive skin",
    ],
    preparationInstructions:
      "Patch test required 48 hours before. Remove contact lenses.",
    aftercareInstructions:
      "Avoid water on brows for 24 hours. No makeup on area for 24 hours.",
    availableFor: ["staff_3", "staff_5"],
    imageUrl: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937",
    isActive: true,
    popularityScore: 76,
    tags: ["brows", "tinting", "quick"],
  },
  {
    id: "treatment_10",
    name: "Body Scrub & Wrap",
    description:
      "Full body exfoliation followed by a nourishing wrap for silky smooth skin.",
    durationMinutes: 75,
    price: 100.0,
    category: "Body",
    benefits: [
      "Removes dead skin",
      "Deeply moisturizing",
      "Improves skin texture",
      "Detoxifying",
      "Relaxing experience",
    ],
    contraindications: [
      "Pregnancy",
      "Skin conditions",
      "Recent sunburn",
      "Open wounds",
    ],
    preparationInstructions:
      "Shower before treatment. Avoid shaving 24 hours prior.",
    aftercareInstructions:
      "Avoid showering for 6-8 hours. Moisturize daily. Drink plenty of water.",
    availableFor: ["staff_1", "staff_2"],
    imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874",
    isActive: true,
    popularityScore: 68,
    tags: ["body-treatment", "exfoliation", "moisturizing"],
  },
  {
    id: "treatment_11",
    name: "Aromatherapy Massage",
    description:
      "Relaxing massage using essential oils tailored to your needs and preferences.",
    durationMinutes: 60,
    price: 90.0,
    category: "Massage",
    benefits: [
      "Stress reduction",
      "Mood enhancement",
      "Better sleep",
      "Pain relief",
      "Emotional balance",
    ],
    contraindications: [
      "Pregnancy (certain oils)",
      "Epilepsy",
      "Allergies to essential oils",
    ],
    preparationInstructions:
      "Discuss oil preferences and allergies with therapist.",
    aftercareInstructions:
      "Drink water. Enjoy the lingering scent. Rest if possible.",
    availableFor: ["staff_2", "staff_4"],
    imageUrl: "https://images.unsplash.com/photo-1600334129128-685c5582fd35",
    isActive: true,
    popularityScore: 87,
    tags: ["aromatherapy", "essential-oils", "holistic"],
  },
  {
    id: "treatment_12",
    name: "Acne Treatment Facial",
    description:
      "Specialized facial targeting acne-prone skin with deep cleansing and treatment products.",
    durationMinutes: 60,
    price: 80.0,
    category: "Facial",
    benefits: [
      "Reduces breakouts",
      "Unclogs pores",
      "Controls oil",
      "Reduces inflammation",
      "Prevents scarring",
    ],
    contraindications: [
      "Accutane treatment",
      "Severe cystic acne",
      "Recent chemical peel",
    ],
    preparationInstructions:
      "List current skincare products. Arrive makeup-free if possible.",
    aftercareInstructions:
      "Follow prescribed skincare routine. Avoid touching face. Change pillowcases regularly.",
    availableFor: ["staff_1", "staff_3"],
    imageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881",
    isActive: true,
    popularityScore: 79,
    tags: ["acne", "therapeutic", "problem-solving"],
  },
  {
    id: "treatment_13",
    name: "Express Facial",
    description:
      "Quick 30-minute facial perfect for busy schedules. Cleanse, exfoliate, and moisturize.",
    durationMinutes: 30,
    price: 50.0,
    category: "Facial",
    benefits: [
      "Quick refresh",
      "Glowing skin",
      "Deep cleansing",
      "Convenient",
      "Budget-friendly",
    ],
    contraindications: ["Active skin infection", "Recent cosmetic procedures"],
    preparationInstructions: "Remove makeup before appointment if possible.",
    aftercareInstructions: "Apply SPF. Keep skin hydrated throughout the day.",
    availableFor: ["staff_1", "staff_3"],
    imageUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2",
    isActive: true,
    popularityScore: 94,
    tags: ["quick", "express", "convenient"],
  },
  {
    id: "treatment_14",
    name: "Prenatal Massage",
    description:
      "Gentle, safe massage designed specifically for expectant mothers.",
    durationMinutes: 60,
    price: 95.0,
    category: "Massage",
    benefits: [
      "Reduces swelling",
      "Relieves back pain",
      "Improves sleep",
      "Reduces anxiety",
      "Safe for baby",
    ],
    contraindications: [
      "High-risk pregnancy",
      "First trimester",
      "Pre-eclampsia",
      "Severe swelling",
    ],
    preparationInstructions:
      "Obtain doctor's approval. Communicate any discomfort during treatment.",
    aftercareInstructions: "Rest and hydrate. Move slowly when getting up.",
    availableFor: ["staff_2"],
    imageUrl: "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8",
    isActive: true,
    popularityScore: 71,
    tags: ["prenatal", "pregnancy-safe", "specialized"],
  },
  {
    id: "treatment_15",
    name: "Lash Lift & Tint",
    description:
      "Semi-permanent treatment that lifts and darkens natural lashes for a wide-eyed look.",
    durationMinutes: 45,
    price: 65.0,
    category: "Beauty",
    benefits: [
      "No daily mascara needed",
      "Lasts 6-8 weeks",
      "Low maintenance",
      "Natural enhancement",
      "Opens up eyes",
    ],
    contraindications: [
      "Eye infections",
      "Very short lashes",
      "Recent eye surgery",
      "Allergic to solutions",
    ],
    preparationInstructions:
      "Patch test required 48 hours before. Remove contact lenses and eye makeup.",
    aftercareInstructions:
      "Keep lashes dry for 24 hours. No mascara for 24 hours. Use lash serum daily.",
    availableFor: ["staff_3", "staff_5"],
    imageUrl: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937",
    isActive: true,
    popularityScore: 89,
    tags: ["lashes", "semi-permanent", "eye-enhancement"],
  },
];
