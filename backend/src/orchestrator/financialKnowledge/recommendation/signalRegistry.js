"use strict";

const SIGNAL_REGISTRY = Object.freeze([
  Object.freeze({ id: "intent_match", description: "The scheme is explicitly mapped to the current intent." }),
  Object.freeze({ id: "need_match", description: "The current intent-specific need has been supplied." }),
  Object.freeze({ id: "crop_relevance", description: "The scheme has documented crop or agricultural relevance." }),
  Object.freeze({ id: "equipment_relevance", description: "The scheme has documented equipment or infrastructure relevance." }),
  Object.freeze({ id: "livestock_relevance", description: "The scheme has documented livestock or allied-activity relevance." }),
  Object.freeze({ id: "geographic_relevance", description: "A user State is available for the scheme's geographic considerations." }),
  Object.freeze({ id: "benefit_category_relevance", description: "The documented benefit category matches the supplied need." }),
]);

const SIGNAL_IDS = Object.freeze(SIGNAL_REGISTRY.map((signal) => signal.id));

module.exports = { SIGNAL_REGISTRY, SIGNAL_IDS };
