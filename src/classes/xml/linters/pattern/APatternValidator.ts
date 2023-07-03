import AMeaningAssumptionGenerator from "./AMeaningAssumptionGenerator";

export default abstract class APatternValidator<AdditionalData> extends AMeaningAssumptionGenerator {
	abstract validateValue(value: string, additionalData: AdditionalData): void;
}
