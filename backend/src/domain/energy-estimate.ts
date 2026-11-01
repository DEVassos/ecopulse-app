export interface EnergyEstimatePersistence {
  carbonIntensityGco2ePerKwh: string;
  powerWatts: string;
  energyKwh: string;
  co2eGrams: string;
}

export class EnergyEstimate {
  readonly #carbonIntensityGco2ePerKwh: string;
  readonly #powerWatts: string;
  readonly #energyKwh: string;
  readonly #co2eGrams: string;

  constructor(values: EnergyEstimatePersistence) {
    this.#carbonIntensityGco2ePerKwh = values.carbonIntensityGco2ePerKwh;
    this.#powerWatts = values.powerWatts;
    this.#energyKwh = values.energyKwh;
    this.#co2eGrams = values.co2eGrams;
  }

  toPersistence(): EnergyEstimatePersistence {
    return { carbonIntensityGco2ePerKwh: this.#carbonIntensityGco2ePerKwh, powerWatts: this.#powerWatts,
      energyKwh: this.#energyKwh, co2eGrams: this.#co2eGrams };
  }
}
