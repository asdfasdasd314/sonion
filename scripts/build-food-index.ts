import { buildAndWriteFoodIndex } from "../lib/food-data/index-builder";

const index = buildAndWriteFoodIndex();
console.log(`Built food-data/food-index.json with ${index.length} normalized foods.`);
