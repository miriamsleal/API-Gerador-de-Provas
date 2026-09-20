import prisma from "../config/database.js";

const professorPublico = {
  select: { id: true, nome: true, email: true, papel: true },
};

export const create = async (req, res) => {
  try {
    const { nome, professorId, ativa } = req.body;

    if (!nome || professorId === undefined) {
      return res.status(400).json({
        success: false,
        message: "Nome e professorId são obrigatórios",
      });
    }

    const idProfessor = Number(professorId);

    if (!Number.isInteger(idProfessor) || idProfessor <= 0) {
      return res.status(400).json({
        success: false,
        message: "professorId inválido. Deve ser um número inteiro positivo",
      });
    }

    const professor = await prisma.user.findUnique({
      where: { id: idProfessor },
    });

    if (!professor) {
      return res.status(404).json({
        success: false,
        message: `Professor com ID ${idProfessor} não encontrado`,
      });
    }

    const novaMateria = await prisma.subject.create({
      data: {
        nome,
        ativa: ativa === undefined ? true : Boolean(ativa),
        professorId: idProfessor,
      },
      select: {
        id: true,
        nome: true,
        ativa: true,
        professorId: true,
        createdAt: true,
        professor: professorPublico,
      },
    });

    res.status(201).json({
      success: true,
      message: "Matéria criada com sucesso",
      data: novaMateria,
    });
  } catch (error) {
    console.error("Erro ao criar matéria:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar matéria",
    });
  }
};

export const getAll = async (req, res) => {
  try {
    const materias = await prisma.subject.findMany({
      include: { professor: professorPublico },
      orderBy: { id: "asc" },
    });

    res.status(200).json({
      success: true,
      data: materias,
      total: materias.length,
    });
  } catch (error) {
    console.error("Erro ao listar matérias:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar matérias",
    });
  }
};

export const getById = async (req, res) => {
  try {
    const subjectId = Number(req.params.id);

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número",
      });
    }

    const materia = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { professor: professorPublico },
    });

    if (!materia) {
      return res.status(404).json({
        success: false,
        message: `Matéria com ID ${subjectId} não encontrada`,
      });
    }

    res.status(200).json({ success: true, data: materia });
  } catch (error) {
    console.error("Erro ao buscar matéria:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar matéria",
    });
  }
};