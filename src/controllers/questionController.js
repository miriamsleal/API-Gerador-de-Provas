import prisma from "../config/database.js";

const autorPublico = {
  select: { id: true, nome: true, email: true, papel: true },
};

const disciplinaPublica = {
  select: { id: true, nome: true, ativa: true },
};

export const create = async (req, res) => {
  try {
    const { enunciado, dificuldade, respostaCorreta, disciplinaId, autorId, ativa } =
      req.body;

    if (!enunciado || dificuldade === undefined || disciplinaId === undefined || autorId === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "Enunciado, dificuldade, disciplinaId e autorId são obrigatórios",
      });
    }

    const nivel = Number(dificuldade);

    if (![1, 2, 3].includes(nivel)) {
      return res.status(400).json({
        success: false,
        message: "Dificuldade deve ser 1 (fácil), 2 (média) ou 3 (difícil)",
      });
    }

    const idDisciplina = Number(disciplinaId);
    const idAutor = Number(autorId);

    if (
      !Number.isInteger(idDisciplina) ||
      idDisciplina <= 0 ||
      !Number.isInteger(idAutor) ||
      idAutor <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "disciplinaId e autorId devem ser números inteiros positivos",
      });
    }

    const disciplina = await prisma.subject.findUnique({
      where: { id: idDisciplina },
    });

    if (!disciplina) {
      return res.status(404).json({
        success: false,
        message: `Matéria com ID ${idDisciplina} não encontrada`,
      });
    }

    const autor = await prisma.user.findUnique({ where: { id: idAutor } });

    if (!autor) {
      return res.status(404).json({
        success: false,
        message: `Autor com ID ${idAutor} não encontrado`,
      });
    }

    const novaQuestao = await prisma.question.create({
      data: {
        enunciado,
        dificuldade: nivel,
        respostaCorreta: respostaCorreta || null,
        disciplinaId: idDisciplina,
        autorId: idAutor,
        ativa: ativa === undefined ? true : Boolean(ativa),
      },
      select: {
        id: true,
        enunciado: true,
        dificuldade: true,
        respostaCorreta: true,
        ativa: true,
        createdAt: true,
        disciplina: disciplinaPublica,
        autor: autorPublico,
      },
    });

    res.status(201).json({
      success: true,
      message: "Questão criada com sucesso",
      data: novaQuestao,
    });
  } catch (error) {
    console.error("Erro ao criar questão:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar questão",
    });
  }
};

export const getAll = async (req, res) => {
  try {
    const questoes = await prisma.question.findMany({
      include: { disciplina: disciplinaPublica, autor: autorPublico },
      orderBy: { id: "asc" },
    });

    res.status(200).json({
      success: true,
      data: questoes,
      total: questoes.length,
    });
  } catch (error) {
    console.error("Erro ao listar questões:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar questões",
    });
  }
};

export const getById = async (req, res) => {
  try {
    const questionId = Number(req.params.id);

    if (!Number.isInteger(questionId) || questionId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número",
      });
    }

    const questao = await prisma.question.findUnique({
      where: { id: questionId },
      include: { disciplina: disciplinaPublica, autor: autorPublico },
    });

    if (!questao) {
      return res.status(404).json({
        success: false,
        message: `Questão com ID ${questionId} não encontrada`,
      });
    }

    res.status(200).json({ success: true, data: questao });
  } catch (error) {
    console.error("Erro ao buscar questão:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar questão",
    });
  }
};