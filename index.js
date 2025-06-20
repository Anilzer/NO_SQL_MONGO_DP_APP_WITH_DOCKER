import express from "express";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";
import { z } from "zod";

console.log("🚀 App démarrée");

const app = express();
const prisma = new PrismaClient();

// Connexion Redis
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis error:", err));

await redisClient.connect();
console.log("Connecté à Redis");

app.use(express.json());

// Schéma Zod pour valider la création d'un bateau
const boatSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères."),
  type: z.string().nonempty("Le type est obligatoire."),
  year: z
    .string()
    .regex(/^\d{4}$/, "L'année doit être un nombre à 4 chiffres.")
    .transform((val) => parseInt(val))
    .refine(
      (yearInt) => yearInt >= 1900 && yearInt <= new Date().getFullYear(),
      {
        message: `L'année doit être comprise entre 1900 et ${new Date().getFullYear()}.`,
      }
    ),
  description: z.string().optional(),
  price: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      { message: "Le prix doit être un nombre positif." }
    )
    .transform((val) => (val !== undefined ? parseFloat(val) : undefined)),
});

// connexion à MongoDB via Prisma
app.get("/", async (req, res) => {
  try {
    await prisma.$connect();
    res.send("Connexion OK à Mongo via Prisma !");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Connexion échouée", details: err.message });
  }
});

// Création d'un bateau avec validation Zod
app.post("/boats/create", async (req, res) => {
  try {
    const data = boatSchema.parse(req.body);

    const boat = await prisma.boat.create({
      data: {
        name: data.name.trim(),
        type: data.type,
        year: data.year,
        description: data.description,
        price: data.price,
      },
    });

    res.status(201).json(boat);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }

    console.error("Erreur :", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "Un bateau avec ce nom existe déjà." });
    }
    res.status(500).json({ error: "Erreur lors de la création du bateau" });
  }
});

// Récupération de tous les bateaux
app.get("/boats", async (req, res) => {
  try {
    const boats = await prisma.boat.findMany();
    res.json(boats);
  } catch (error) {
    console.error("Erreur lors de la récupération des bateaux :", error);
    res.status(500).json({ error: "Impossible de récupérer les bateaux" });
  }
});

// Recherche de bateaux avec des filtres
app.get("/boats/search", async (req, res) => {
  const { name, minPrice, maxPrice } = req.query;

  try {
    const boats = await prisma.boat.findMany({
      where: {
        name: name ? { contains: name, mode: "insensitive" } : undefined,
        price: {
          gte: minPrice ? parseFloat(minPrice) : undefined,
          lte: maxPrice ? parseFloat(maxPrice) : undefined,
        },
      },
    });
    res.json(boats);
  } catch (error) {
    res.status(500).json({ error: "Erreur de filtre", details: error.message });
  }
});

// Récupération d'un bateau par ID
app.get("/boats/:id", async (req, res) => {
  try {
    const boat = await prisma.boat.findUnique({
      where: { id: req.params.id },
    });
    boat
      ? res.json(boat)
      : res.status(404).json({ error: "Bateau introuvable" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erreur de récupération", details: error.message });
  }
});

// Mise à jour d'un bateau
app.put("/boats/:id", async (req, res) => {
  try {
    const updated = await prisma.boat.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erreur de mise à jour", details: error.message });
  }
});

// Suppression d'un bateau
app.delete("/boats/:id", async (req, res) => {
  try {
    await prisma.boat.delete({
      where: { id: req.params.id },
    });
    res
      .status(200)
      .json({
        message: `Bateau avec l'ID ${req.params.id} supprimé avec succès.`,
      });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erreur de suppression", details: error.message });
  }
});

// Route de test pour Redis
app.get("/redis/test", async (req, res) => {
  try {
    await redisClient.set("cle", "Bonjour, on es sur Redis !");
    const value = await redisClient.get("cle");
    res.json({ redisMessage: value });
  } catch (error) {
    res.status(500).json({ error: "Erreur Redis", details: error.message });
  }
});

app.listen(3000, () => {
  console.log("Serveur démarré sur http://localhost:3000");
});
