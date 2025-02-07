import Income from '../models/income.js';
import mongoose from 'mongoose';

export const createIncome = async (req, res) => {
  try {
    const income = new Income(req.body);
    const savedIncome = await income.save();
    res.status(201).json(savedIncome);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllIncomes = async (req, res) => {
  try {
    const incomes = await Income.find().populate('userId');
    res.status(200).json(incomes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getIncomeByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const incomes = await Income.find({ userId });
    if (!incomes || incomes.length === 0) {
      return res.status(404).json({ message: 'No income found for this user' });
    }

    res.status(200).json(incomes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateIncomeById = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedIncome = await Income.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedIncome) {
      return res.status(404).json({ message: 'Income not found' });
    }
    res.status(200).json(updatedIncome);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteIncomeById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedIncome = await Income.findByIdAndDelete(id);
    if (!deletedIncome) {
      return res.status(404).json({ message: 'Income not found' });
    }
    res.status(200).json({ message: 'Income deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
