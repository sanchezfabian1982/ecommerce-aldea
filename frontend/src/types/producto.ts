export interface ProductoFormData {
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoriaDocumentId: string;
  imagen: File | null;
}

export interface CategoriaOption {
  id: number | string;
  documentId: string;
  nombre: string;
  slug: string;
}
