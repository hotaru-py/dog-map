export interface Dog {
  id: number;
  name: string;
  breed: string;
  location: {
    lat: number;
    lng: number;
  };
  photos: string[];
  description: string;
}
