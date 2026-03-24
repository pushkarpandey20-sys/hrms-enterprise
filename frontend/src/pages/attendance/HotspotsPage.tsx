import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Wifi, MapPin, Trash2, Users, UserPlus, UserMinus, X } from 'lucide-react';
import { attendanceApi, employeeApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';