# Feature: Public Art Sharing

## Overview
Cette fonctionnalité permet aux utilisateurs de générer un lien public pour partager leurs créations artistiques. Le lien public inclut une image de prévisualisation et permet aux autres utilisateurs de voir et d'éditer l'art.

## Database Structure
La table `public_user_art_docs` a été créée avec la structure suivante:

```sql
CREATE TABLE public.public_user_art_docs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_art_doc_id uuid NOT NULL,
  public_slug text NOT NULL UNIQUE,
  title text NULL,
  description text NULL,
  preview_url text NOT NULL,
  is_indexable boolean DEFAULT true,
  created_at timestamp WITHOUT TIME ZONE DEFAULT now(),
  CONSTRAINT public_user_art_docs_pkey PRIMARY KEY (id),
  CONSTRAINT fk_user_art_doc FOREIGN KEY (user_art_doc_id)
    REFERENCES user_art_docs (id)
    ON DELETE CASCADE
);
```

## Components

### 1. PublicArtService (`public-art.service.ts`)
Service pour gérer les opérations sur la table `public_user_art_docs`.

**Méthodes principales:**
- `generateSlug(title?: string): string` - Génère un slug unique basé sur le titre
- `createPublicLink(publicArtDoc: IPublicArtDoc): Observable<IPublicArtDoc>` - Crée un lien public
- `getPublicArtBySlug(slug: string): Observable<IPublicArtDoc>` - Récupère un art public par slug
- `getPublicLinkForArtDoc(userArtDocId: string): Observable<IPublicArtDoc | null>` - Vérifie si un lien existe déjà
- `updatePublicLink(id: string, updates: Partial<IPublicArtDoc>)` - Met à jour un lien public
- `deletePublicLink(id: string)` - Supprime un lien public

### 2. SharePublicLinkComponent (`share-public-link.component.ts`)
Composant modal pour créer et afficher les liens publics.

**Fonctionnalités:**
- Formulaire pour entrer le titre, la description et l'option SEO
- Affichage du lien public généré
- Copie du lien dans le presse-papiers
- Détection des liens publics existants

### 3. ShareOptionsComponent (`share-options.component.ts`)
Composant drawer pour choisir entre export et création d'un lien public.

**Options disponibles:**
- Download & Export - pour télécharger l'art en PDF/PNG/JPEG
- Create Public Link - pour générer un lien public partageable

### 4. PublicArtViewComponent (`public-art-view.component.ts`)
Page publique pour afficher les arts avec lien public.

**Fonctionnalités:**
- Affichage de l'image d'aperçu
- Informations SEO (titre et description)
- Bouton pour éditer le design original
- Copie du lien public
- Gestion des erreurs (art non trouvé)

## User Flow

### Création d'un lien public

1. L'utilisateur clique sur le bouton "Share" dans l'éditeur
2. Un drawer s'ouvre avec deux options: "Download & Export" et "Create Public Link"
3. L'utilisateur sélectionne "Create Public Link"
4. Un modal s'ouvre avec un formulaire pour:
   - Titre de l'art
   - Description (SEO)
   - Option d'indexation par les moteurs de recherche
5. L'utilisateur clique sur "Create Public Link"
6. Le système:
   - Génère une image de prévisualisation à partir du canvas
   - Upload la prévisualisation vers Supabase Storage
   - Crée une entrée dans la table `public_user_art_docs`
   - Génère un slug unique
7. Un lien public est affiché et peut être copié

### Affichage d'un lien public

1. L'utilisateur accède à `/public-art/{slug}`
2. Le système récupère les informations publiques
3. Affichage de:
   - L'image de prévisualisation
   - Le titre et la description (SEO)
   - Un bouton pour éditer le design original
   - Un bouton pour copier le lien

## Integration with Author Component

### Changes in `author.component.ts`:

1. **Imports:**
   - `PublicArtService` - pour la gestion des liens publics
   - `SharePublicLinkComponent` - composant modal
   - `ShareOptionsComponent` - drawer des options

2. **Properties:**
   - `shareDrawer: boolean` - contrôle du drawer de partage
   - `userHasDownloaded: boolean` - flag pour afficher le modal après le premier téléchargement
   - `previewImageUrl: string` - URL de l'image de prévisualisation

3. **Methods:**
   - `openShareMenu()` - ouvre le drawer de partage
   - `closeShareDrawer()` - ferme le drawer
   - `generatePreviewImage()` - génère une image de prévisualisation depuis le canvas
   - `uploadPreviewToStorage()` - upload la prévisualisation à Supabase
   - `openShareModal()` - ouvre le modal de création du lien public
   - `onShareAction()` - gère les actions du drawer de partage

### Changes in `author.component.html`:

1. Le bouton "Export" est renommé en "Share"
2. Un nouveau drawer est ajouté pour afficher les options de partage

## Routing

Ajouter cette route dans le routing module du projet:

```typescript
{
  path: 'public-art/:slug',
  component: PublicArtViewComponent
}
```

## Storage Structure

Les images de prévisualisation sont stockées dans Supabase Storage:
- Bucket: `thubnails`
- Path: `previews/preview-{artDocId}.png`

## Security Considerations

1. **Access Control:** 
   - Les liens publics peuvent être visualisés par n'importe qui
   - Seul l'auteur peut éditer l'art original

2. **SEO:**
   - Le flag `is_indexable` permet de contrôler si le lien peut être indexé par les moteurs de recherche
   - Le titre et la description sont utilisés comme meta tags

3. **Data Validation:**
   - Validation des slugs (unicité)
   - Validation des entrées du formulaire
   - Gestion des erreurs de upload

## Future Enhancements

1. Ajout de statistiques d'affichage des liens publics
2. Partage social (Facebook, Twitter, LinkedIn)
3. Notifications quand quelqu'un voit le lien public
4. Limitation du nombre de liens publics par utilisateur
5. Expiration automatique des liens publics
6. Protection par mot de passe des liens publics
7. Watermark automatique sur l'image de prévisualisation

## Testing Checklist

- [ ] Création d'un lien public
- [ ] Vérification de l'unicité du slug
- [ ] Affichage de la page publique
- [ ] Copie du lien public
- [ ] Édition du design original depuis la page publique
- [ ] Gestion des erreurs (art non trouvé)
- [ ] Upload de l'image de prévisualisation
- [ ] Validation du formulaire (titre requis, description min 10 caractères)
- [ ] SEO - méta tags correctement définis
- [ ] Responsive design sur mobile
