import { DanceCategory, RegistrationParticipant } from "@/types";

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    details?: {
        totalParticipants: number;
        validParticipants: number;
        percentage: number;
        invalidParticipants: RegistrationParticipant[];
        suggestedCategory?: DanceCategory;
    };
}

/**
 * Checks if a participant's birth year complies with a category rule.
 * Returns true if valid.
 */
export const checkAge = (dob: string | null, rule: (year: number) => boolean): boolean => {
    if (!dob) return false;
    const year = new Date(dob).getFullYear();
    return rule(year);
};

/**
 * Returns the validation rule function for a given category.
 * Based on 2026 season rules.
 */
export const getCategoryRule = (cat: DanceCategory): ((year: number) => boolean) | null => {
    if (cat.includes('Infantil') || cat.includes('Mini-Solistas Infantil')) return y => y >= 2014; // <= 12 years (in 2026)
    if (cat.includes('Junior') || cat.includes('Mini-Solistas Junior')) return y => y >= 2011;   // <= 15 years
    if (cat.includes('Juvenil') || cat.includes('Solistas Juvenil')) return y => y >= 2009;    // <= 17 years
    if (cat === 'Premium') return y => y <= 1995;                                              // >= 31 years
    // Absoluta: Everyone fits
    if (cat === 'Absoluta' || cat === 'Parejas' || cat === 'Solistas Absoluta') return () => true;

    return null; // legacy or unknown
};

/**
 * Validates a list of participants against a category using the 75% rule.
 * 
 * Rule: At least 75% of participants must meet the age requirement for the category.
 * If not, it attempts to find the next valid category in the progression.
 */
export const validateCategoryRules = (
    category: DanceCategory,
    participants: RegistrationParticipant[]
): ValidationResult => {
    if (participants.length === 0) {
        return { isValid: false, error: "Debes añadir al menos 1 participante." };
    }

    // 1. Participant Count Checks
    if (category.includes('Solistas')) {
        if (participants.length !== 1) return { isValid: false, error: `En la categoría ${category}, debe haber exactamente 1 participante.` };
    } else if (category.includes('Parejas') || category.includes('Mini-parejas')) {
        if (participants.length !== 2) return { isValid: false, error: `En la categoría ${category}, deben haber exactamente 2 participantes.` };
    } else {
        // Groups
        if (participants.length < 3) {
            return { isValid: false, error: `En la categoría de Grupos (${category}), debe haber al menos 3 participantes.` };
        }
    }

    // 2. Age Check (75% Rule)
    const rule = getCategoryRule(category);
    if (!rule) return { isValid: true }; // No strict rules

    const invalidParticipants = participants.filter(p => !checkAge(p.dob, rule));
    const validCount = participants.length - invalidParticipants.length;
    const percentage = (validCount / participants.length) * 100;

    if (percentage >= 75) {
        return {
            isValid: true,
            details: {
                totalParticipants: participants.length,
                validParticipants: validCount,
                percentage,
                invalidParticipants
            }
        };
    }

    // Failed 75% rule - Try to find promotion
    let nextCategory: DanceCategory | null = null;
    const groupsProg = ['Infantil', 'Junior', 'Juvenil', 'Absoluta'];
    const pairsProg = ['Infantil Mini-parejas', 'Junior Mini-parejas', 'Juvenil Parejas', 'Parejas'];
    const solosProg = ['Mini-Solistas Infantil', 'Mini-Solistas Junior', 'Solistas Juvenil', 'Solistas Absoluta'];

    let activeProgression: DanceCategory[] | null = null;

    if (groupsProg.includes(category)) activeProgression = groupsProg as DanceCategory[];
    else if (pairsProg.includes(category)) activeProgression = pairsProg as DanceCategory[];
    else if (solosProg.includes(category)) activeProgression = solosProg as DanceCategory[];
    else if (category === 'Premium') nextCategory = 'Absoluta';

    if (activeProgression) {
        const startIdx = activeProgression.indexOf(category);
        for (let i = startIdx + 1; i < activeProgression.length; i++) {
            const potentialCat = activeProgression[i];
            const potentialRule = getCategoryRule(potentialCat);
            if (!potentialRule) continue; // Should not happen in pure progressions, maybe Absoluta (true)

            // Calculate percentage for potential category
            // Note: For Absoluta rule is () => true, so 100% valid.
            const potInvalid = participants.filter(p => !checkAge(p.dob, potentialRule));
            const potValid = participants.length - potInvalid.length;
            const potPct = (potValid / participants.length) * 100;

            if (potPct >= 75) {
                nextCategory = potentialCat;
                break;
            }
        }
    }

    return {
        isValid: false,
        error: `Menos del 75% de los participantes cumplen con la edad de ${category}.`,
        details: {
            totalParticipants: participants.length,
            validParticipants: validCount,
            percentage,
            invalidParticipants,
            suggestedCategory: nextCategory || undefined
        }
    };
};
