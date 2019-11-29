export interface AdminDataSource {
  getInstitution(id: number) : Promise<string | null>;
  getInstitutions(): Promise<Entry[]>;
  getCountries(): Promise<Entry[]>;
  getNationalities(): Promise<Entry[]>;
  get(id: number): Promise<string | null>;
  setPageText(id: number, text: string): Promise<Page>;
}
export class Entry {
  constructor(public id: number, public value: string) {}
}
