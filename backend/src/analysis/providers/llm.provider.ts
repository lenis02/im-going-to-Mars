export interface LlmProvider {
  analyzeChart(imageBase64: string, context: string): Promise<string>;
  analyzeDisclosure(text: string): Promise<string>;
}
